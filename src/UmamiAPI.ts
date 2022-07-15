import axios from "axios";
import { TTimePeriod, convertPeriodToTime } from "./utils/time-periods";

type TUnit = "year" | "month" | "day" | "hour";
type TMetric = "url" | "referrer" | "browser" | "os" | "device" | "country" | "event";

interface IAuthData {
	token: string;
	user: {
		user_id: number;
		username: string;
		is_admin: boolean;
	};
}

interface ITrackedWebsite {
	website_id: number;
	website_uuid: string;
	user_id: number;
	name: string;
	domain: string;
	share_id: string | null;
	created_at: string;
}

interface IStats {
	pageviews: { value: number; change: number };
	uniques: { value: number; change: number };
	bounces: { value: number; change: number };
	totaltime: { value: number; change: number };
}

interface IPageViews {
	/**
	 * @param t The time period of the data
	 * @param y The amount of page views in the time period
	 */
	pageviews: { t: string; y: number }[];
	/**
	 * @param t The time period of the data
	 * @param y The amount of sessions in the time period
	 */
	sessions: { t: string; y: number }[];
}

/**
 * @param x The name of the event (The type is only available via the metrics)
 * @param t The time period of the data
 * @param y The amount of events in the time period
 */
interface IEvent {
	x: string;
	t: string;
	y: number;
}

/**
 * @param x The metric's value
 * @param y The amount of this metric's value in the period of time
 */
interface IMetric {
	x: string | null;
	y: number;
}

interface IPageViewPayload {
	website: string;
	url: string;
	referrer?: string;
	hostname: string;
	language?: string;
	screen?: string;
}
interface IEventPayload extends Omit<IPageViewPayload, "referrer"> {
	event_type: string;
	event_value: string;
}

class BaseUmamiAPI {
	protected _server: string;

	/**
	 * @param server The Umami installation hostname (e.g. app.umami.is). The protocol, if present, will be removed.
	 */
	constructor(server: string) {
		if (!server) {
			throw new Error("A server hostname is required");
		}
		this._server = server.replace(/https?:\/\//, "");
	}

	/**
	 * Collects a pageview
	 * @param type The type of event to send
	 * @param payload The payload of the pageview
	 * @param userAgent Value of the User-Agent header. Necessary for platform detection. Defaults to Firefox on Mac OS on a laptop
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/collect.js#L75 Relevant Umami source code}
	 */
	async collect(type: "pageview", payload: IPageViewPayload, userAgent?: string): Promise<string>;
	/**
	 * Collects an event
	 * @param type The type of event to send
	 * @param payload The payload of the event
	 * @param userAgent Value of the User-Agent header. Necessary for platform detection. Defaults to Firefox on Mac OS on a laptop
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/collect.js#L77 Relevant Umami source code}
	 */
	async collect(type: "event", payload: IEventPayload, userAgent?: string): Promise<string>;
	async collect(
		type: "pageview" | "event",
		payload: IEventPayload | IPageViewPayload,
		userAgent: string = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:102.0) Gecko/20100101 Firefox/102.0"
	): Promise<string> {
		if (userAgent === "") {
			throw new Error(
				"A user agent is required for the /api/collect endpoint to work. See https://umami.is/docs/api"
			);
		}

		try {
			const { data } = await axios.post(
				`https://${this._server}/api/collect`,
				{ type, payload },
				{ headers: { "User-Agent": userAgent } }
			);
			return data;
		} catch (error) {
			throw new Error(`Collect failed`, { cause: error.toString() });
		}
	}
}

export default class UmamiAPI extends BaseUmamiAPI {
	/**
	 * Authenticates a user, to be able to use authenticated API functions
	 * @param username Username of the user you want to login
	 * @param password Password of the user you want to login
	 * @returns An authenticated class instance, able to use more functionality.
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/auth/login.js Relevant Umami source code}
	 */
	async auth(username: string, password: string): Promise<AuthenticatedUmamiAPI> {
		try {
			const { data } = await axios.post(`https://${this._server}/api/auth/login`, {
				username,
				password,
			});

			return new AuthenticatedUmamiAPI(this._server, data);
		} catch (error) {
			throw new Error("Login failed", { cause: error.toString() });
		}
	}
}

class AuthenticatedUmamiAPI extends BaseUmamiAPI {
	protected _token: IAuthData["token"];
	public user: IAuthData["user"];
	public is_admin: boolean;

	constructor(server: string, auth: IAuthData) {
		super(server);
		this._token = auth.token;
		this.user = auth.user;
	}

	protected assertAdmin(message: string) {
		if (!this.is_admin) {
			throw new Error(message);
		}
	}

	protected async POST(endpoint: string, options?: any) {
		const url = `https://${this._server}/api${endpoint}`;

		try {
			const { data } = await axios.post(url, options, {
				headers: { Authorization: `Bearer ${this._token}` },
			});
			return data;
		} catch (error) {
			throw new Error(`POST request to ${url} failed`, { cause: error.toString() });
		}
	}

	protected async GET(endpoint: string, options?: any) {
		const params = options ? new URLSearchParams(options).toString() : "";
		const url = `https://${this._server}/api${endpoint}?${params}`;

		try {
			const { data } = await axios.get(url, {
				headers: { Authorization: `Bearer ${this._token}` },
			});
			return data;
		} catch (error) {
			throw new Error(`GET request to ${url} failed`, { cause: error.toString() });
		}
	}

	protected async DELETE(endpoint: string) {
		const url = `https://${this._server}/api${endpoint}`;

		try {
			const { data } = await axios.delete(url, {
				headers: { Authorization: `Bearer ${this._token}` },
			});
			return data;
		} catch (error) {
			throw new Error(`DELETE request to ${url} failed`, { cause: error.toString() });
		}
	}

	/**
	 * Creates a new website and returns its information.
	 * @param options.domain The domain name of the website (e.g. umami.is)
	 * @param options.name The name of the website (usually the same as the domain)
	 * @param options.enable_share_url Whether or not to enable public sharing.
	 * @returns The new website's information
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/website/index.js#L36 Relevant Umami source code}
	 */
	async createWebsite(options: {
		domain: string;
		name: string;
		enable_share_url?: boolean;
	}): Promise<ITrackedWebsite> {
		return await this.POST("/website", options);
	}

	/**
	 * Updates a website and returns its information.
	 * @param website_id The website's ID (not UUID)
	 * @param options.domain The domain name of the website (e.g. umami.is)
	 * @param options.name The name of the website (usually the same as the domain)
	 * @param options.enable_share_url Whether or not to enable public sharing.
	 * @returns The website's information
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/website/index.js#L30 Relevant Umami source code}
	 */
	async updateWebsite(
		website_id: number,
		options: {
			domain: string;
			name: string;
			enable_share_url?: boolean;
		}
	): Promise<ITrackedWebsite> {
		return await this.POST("/website", { website_id, ...options });
	}

	/**
	 * Get the first website that gets returned by Umami
	 * @returns The first website
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/websites/index.js Relevant Umami source code}
	 */
	async getWebsite(): Promise<ITrackedWebsite>;
	/**
	 * Get the website by its ID (not UUID)
	 * @returns The website
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/website/[id]/index.js Relevant Umami source code}
	 */
	async getWebsite(website_id: number): Promise<ITrackedWebsite>;
	/**
	 * Get a website by a property
	 * @param key The property to check
	 * @param value The value to check the property against
	 * @returns The website
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/websites/index.js Relevant Umami source code}
	 * @example
	 * Get a website by domain name
	 * ```ts
	 * const website = await getWebsite("domain", "example.com");
	 * ```
	 */
	async getWebsite(key: keyof ITrackedWebsite, value: string): Promise<ITrackedWebsite>;
	async getWebsite(
		keyOrId?: keyof ITrackedWebsite | number,
		value?: string
	): Promise<ITrackedWebsite> {
		if ((!keyOrId && !value) || (keyOrId && value)) {
			const websites = await this.getWebsites();
			if (!keyOrId) {
				return websites[0];
			}
			return websites.find((website) => website[keyOrId] == value);
		}

		return await this.GET(`/website/${keyOrId}`);
	}

	async resetWebsite(website_id: number) {
		return await this.GET(`/website/${website_id}/reset`);
	}

	async deleteWebsite(website_id: number) {
		return await this.DELETE(`/website/${website_id}`);
	}

	/**
	 * Gets tracked websites
	 * @param options.include_all Whether or not to include all websites (admin only)
	 * @param options.user_id The user to query websites from (admin only, if not your own user id)
	 * @returns An array of tracked websites
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/websites/index.js Relevant Umami source code}
	 */
	async getWebsites(options?: {
		include_all?: boolean;
		user_id?: number;
	}): Promise<ITrackedWebsite[]> {
		if (options.include_all || options.user_id) {
			this.assertAdmin("You are not authorized to view these websites");
		}
		return await this.GET("/websites", options);
	}

	/**
	 * Gets the stats of a website from a specified time period using it's ID
	 * @param website_id The website's ID (not UUID)
	 * @param period The time period of stats to return
	 * @returns The website's stats from the specified time period
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/website/[id]/stats.js Relevant Umami source code}
	 */
	async getStats(website_id: number, period: TTimePeriod = "1d"): Promise<IStats> {
		return await this.GET(`/website/${website_id}/stats`, {
			...convertPeriodToTime(period),
		});
	}

	/**
	 * Gets the pageviews of a website from a specified time period using it's ID
	 * @param website_id The website's ID (not UUID)
	 * @param period The time period of pageviews to return
	 * @param options.unit The interval of time/precision of the returned pageviews
	 * @param options.tz The timezone you're in (defaults to "America/Toronto")
	 * @returns The website's pageviews from the specified time period
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/website/[id]/pageviews.js Relevant Umami source code}
	 */
	async getPageViews(
		website_id: number,
		period: TTimePeriod = "1d",
		options: { unit: TUnit; tz: string } = { unit: "hour", tz: "America/Toronto" }
	): Promise<IPageViews> {
		return await this.GET(`/website/${website_id}/pageviews`, {
			...convertPeriodToTime(period),
			...options,
		});
	}

	/**
	 * Gets the events of a website from a specified time period using it's ID
	 * @param website_id The website's ID (not UUID)
	 * @param period The time period of events to return
	 * @param options.unit The interval of time/precision of the returned pageviews
	 * @param options.tz The timezone you're in (defaults to "America/Toronto")
	 * @returns An array of events from the specified time period
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/website/[id]/events.js Relevant Umami source code}
	 */
	async getEvents(
		website_id: number,
		period: TTimePeriod = "1d",
		options: { unit: TUnit; tz: string } = { unit: "hour", tz: "America/Toronto" }
	): Promise<IEvent[]> {
		return await this.GET(`/website/${website_id}/events`, {
			...convertPeriodToTime(period),
			...options,
		});
	}

	async getEventsBy(
		website_id: number,
		filter: "type" | "name",
		value: string,
		period: TTimePeriod = "1d"
	) {
		const events = await this.getMetrics(website_id, period, { type: "event" });

		return events.reduce((total, { x, y }) => {
			const [type, name] = x.split("\t");
			switch (filter) {
				case "type":
					if (type == value) {
						return total + y;
					}
					break;

				case "name":
					if (name == value) {
						return total + y;
					}
					break;
			}
			return total;
		}, 0);
	}

	/**
	 * Gets a type of metrics of a website from a specified time period using it's ID
	 * @param website_id The website's ID (not UUID)
	 * @param period The time period of events to return
	 * @param options.type The type of metric to get. Defaults to url
	 * @returns An array of metrics from the specified time period
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/website/[id]/metrics.js Relevant Umami source code}
	 */
	async getMetrics(
		website_id: number,
		period: TTimePeriod = "1d",
		options: { type: TMetric } = { type: "url" }
	): Promise<IMetric[]> {
		return await this.GET(`/website/${website_id}/metrics`, {
			...convertPeriodToTime(period),
			...options,
		});
	}

	async getActiveVisitors(website_id: number) {
		return await this.GET(`/website/${website_id}/active`);
	}

	/**
	 * Gets all the user accounts
	 * @returns An array of all the user accounts
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/accounts/index.js Relevant Umami source code}
	 */
	async getAccounts() {
		this.assertAdmin("You are not authorized to get the accounts.");
		return await this.GET("/accounts");
	}
}
