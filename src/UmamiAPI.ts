import axios, { AxiosInstance } from "axios";
import { TTimePeriod, convertPeriodToTime } from "./utils/time-periods";

type TUnit = "year" | "month" | "day" | "hour";
type TMetric = "url" | "referrer" | "browser" | "os" | "device" | "country" | "event";

interface IAuthData {
	token: string;
	user: {
		user_id: number;
		username: string;
		is_admin: boolean;
		iat?: number;
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

export default class UmamiAPI {
	private _server: string;
	private _axios: AxiosInstance;

	/**
	 * @param server The Umami installation hostname (e.g. app.umami.is). The protocol, if present, will be removed.
	 */
	constructor(server: string) {
		if (!server) {
			throw new Error("A server hostname is required");
		}
		this._server = server;
		this._axios = axios.create({
			baseURL: `https://${this._server.replace(/https?:\/\//, "")}/api`,
			timeout: 1000,
		});
	}

	/**
	 * Collects a pageview
	 * @param type The type of event to send
	 * @param payload The payload of the pageview
	 * @param userAgent Value of the User-Agent header. Necessary for platform detection. Defaults to Firefox on Mac OS on a laptop
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/collect.js#L75 Relevant Umami source code}
	 */
	public async collect(
		type: "pageview",
		payload: IPageViewPayload,
		userAgent?: string
	): Promise<string>;
	/**
	 * Collects an event
	 * @param type The type of event to send
	 * @param payload The payload of the event
	 * @param userAgent Value of the User-Agent header. Necessary for platform detection. Defaults to Firefox on Mac OS on a laptop
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/collect.js#L77 Relevant Umami source code}
	 */
	public async collect(type: "event", payload: IEventPayload, userAgent?: string): Promise<string>;
	public async collect(
		type: "pageview" | "event",
		payload: IEventPayload | IPageViewPayload,
		userAgent: string = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:102.0) Gecko/20100101 Firefox/102.0"
	): Promise<string> {
		try {
			if (!userAgent) {
				throw new Error(
					"A user agent is required for the /api/collect endpoint to work. See https://umami.is/docs/api"
				);
			}

			const { data } = await this._axios.post(
				"/collect",
				{ type, payload },
				{ headers: { "User-Agent": userAgent } }
			);
			return data;
		} catch (error) {
			throw new Error(`Collect failed`, { cause: error.toString() });
		}
	}

	/*** AUTHENTICATED FUNCTIONS ***/
	private _auth: IAuthData;
	private _defaultPeriod: TTimePeriod = "24h";
	private _lastAuthCheck: number;

	/**
	 * Authenticates a user, to be able to use authenticated API functions
	 * @param username Username of the user you want to login
	 * @param password Password of the user you want to login
	 * @returns An authenticated class instance, able to use more functionality.
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/auth/login.js Relevant Umami source code}
	 */
	public async auth(username: string, password: string) {
		try {
			if (!username || !password) throw new Error("You must specify a username and a password");

			const { data } = await this._axios.post("/auth/login", {
				username,
				password,
			});

			this._auth = data;
			this._axios.defaults.headers.common["Authorization"] = `Bearer ${this._auth.token}`;
			this._lastAuthCheck = Date.now();
			return this;
		} catch (error) {
			throw new Error("Login failed", { cause: error.toString() });
		}
	}

	public setDefaultPeriod(period: TTimePeriod) {
		this._defaultPeriod = period;
	}

	public getDefaultPeriod() {
		return this._defaultPeriod;
	}

	public getCurrentUser() {
		return this._auth.user;
	}

	private async verifyAuth(admin = false) {
		if (!this._auth) {
			throw new Error("You must be logged in to use this function");
		}

		if (admin && !this._auth.user.is_admin) {
			throw new Error("You must be an administrator to use this function");
		}

		if (this._lastAuthCheck + 60 * 60 * 1000 < Date.now()) {
			try {
				const { data } = await this._axios.get("/auth/verify");
				this._auth.user = data;

				if (admin && !data.is_admin) {
					throw new Error("You must be an administrator to use this function");
				}
			} catch (error) {
				throw new Error("Could not verify authentication", { cause: error.toString() });
			}
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
	public async createWebsite(options: {
		domain: string;
		name: string;
		enable_share_url?: boolean;
	}): Promise<ITrackedWebsite> {
		try {
			await this.verifyAuth();

			const { data } = await this._axios.post("/website", options);
			return data;
		} catch (error) {
			throw new Error(`POST request to /api/website failed`, { cause: error.toString() });
		}
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
	public async updateWebsite(
		website_id: number,
		options: {
			domain: string;
			name: string;
			enable_share_url?: boolean;
		}
	): Promise<ITrackedWebsite> {
		try {
			await this.verifyAuth();

			const { data } = await this._axios.post("/website", { website_id, ...options });
			return data;
		} catch (error) {
			throw new Error(`POST request to /api/website failed`, { cause: error.toString() });
		}
	}

	/**
	 * Get the first website that gets returned by Umami
	 * @returns The first website
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/websites/index.js Relevant Umami source code}
	 */
	public async getWebsite(): Promise<ITrackedWebsite>;
	/**
	 * Get the website by its ID (not UUID)
	 * @returns The website
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/website/[id]/index.js Relevant Umami source code}
	 */
	public async getWebsite(website_id: number): Promise<ITrackedWebsite>;
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
	public async getWebsite(key: keyof ITrackedWebsite, value: string): Promise<ITrackedWebsite>;
	public async getWebsite(
		keyOrId?: keyof ITrackedWebsite | number,
		value?: string
	): Promise<ITrackedWebsite> {
		try {
			await this.verifyAuth();

			if ((!keyOrId && !value) || (keyOrId && value)) {
				const websites = await this.getWebsites();
				if (!keyOrId) {
					return websites[0];
				}
				return websites.find((website) => website[keyOrId as keyof ITrackedWebsite] == value);
			}

			const { data } = await this._axios.get(`/website/${keyOrId}`);
			return data;
		} catch (error) {
			throw new Error(`GET request to /api/website/${keyOrId} failed`, {
				cause: error.toString(),
			});
		}
	}

	public async resetWebsite(website_id: number) {
		try {
			await this.verifyAuth();

			const { data } = await this._axios.post(`/website/${website_id}/reset`);
			return data;
		} catch (error) {
			throw new Error(`POST request to /api/website/${website_id}/reset failed`, {
				cause: error.toString(),
			});
		}
	}

	public async deleteWebsite(website_id: number) {
		try {
			await this.verifyAuth();

			await this._axios.delete(`/website/${website_id}`);
		} catch (error) {
			throw new Error(`DELETE request to /api/website/${website_id} failed`, {
				cause: error.toString(),
			});
		}
	}

	/**
	 * Gets tracked websites
	 * @param options.include_all Whether or not to include all websites (admin only)
	 * @param options.user_id The user to query websites from (admin only, if not your own user id)
	 * @returns An array of tracked websites
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/websites/index.js Relevant Umami source code}
	 */
	public async getWebsites(options?: {
		include_all?: boolean;
		user_id?: number;
	}): Promise<ITrackedWebsite[]> {
		try {
			await this.verifyAuth(!!(options.include_all || options.user_id));

			const { data } = await this._axios.get("/websites", { params: options });
			return data;
		} catch (error) {
			throw new Error(`GET request to /api/websites failed with params: ${options.toString()}`, {
				cause: error.toString(),
			});
		}
	}

	/**
	 * Gets the stats of a website from a specified time period using it's ID
	 * @param website_id The website's ID (not UUID)
	 * @param period The time period of stats to return
	 * @returns The website's stats from the specified time period
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/website/[id]/stats.js Relevant Umami source code}
	 */
	public async getStats(
		website_id: number,
		period: TTimePeriod = this._defaultPeriod
	): Promise<IStats> {
		const options = { ...convertPeriodToTime(period) };
		try {
			await this.verifyAuth();

			const { data } = await this._axios.get(`/website/${website_id}/stats`, { params: options });
			return data;
		} catch (error) {
			throw new Error(
				`GET request to /api/website/${website_id}/stats failed with params: ${options.toString()}`,
				{
					cause: error.toString(),
				}
			);
		}
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
	public async getPageViews(
		website_id: number,
		period: TTimePeriod = this._defaultPeriod,
		options: { unit: TUnit; tz: string } = { unit: "hour", tz: "America/Toronto" }
	): Promise<IPageViews> {
		options = { ...convertPeriodToTime(period), ...options } as any;

		try {
			await this.verifyAuth();

			const { data } = await this._axios.get(`/website/${website_id}/pageviews`, {
				params: options,
			});
			return data;
		} catch (error) {
			throw new Error(
				`GET request to /api/website/${website_id}/pageviews failed with params: ${options.toString()}`,
				{
					cause: error.toString(),
				}
			);
		}
	}

	/**
	 * Gets the events of a website from a specified time period using it's ID
	 * @param website_id The website's ID (not UUID)
	 * @param period The time period of events to return
	 * @param options.unit The interval of time/precision of the returned events
	 * @param options.tz The timezone you're in (defaults to "America/Toronto")
	 * @returns An array of events from the specified time period
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/website/[id]/events.js Relevant Umami source code}
	 */
	public async getEvents(
		website_id: number,
		period: TTimePeriod = this._defaultPeriod,
		options: { unit: TUnit; tz: string } = { unit: "hour", tz: "America/Toronto" }
	): Promise<IEvent[]> {
		options = { ...convertPeriodToTime(period), ...options } as any;

		try {
			await this.verifyAuth();

			const { data } = await this._axios.get(`/website/${website_id}/events`, {
				params: options,
			});
			return data;
		} catch (error) {
			throw new Error(
				`GET request to /api/website/${website_id}/events failed with params: ${options.toString()}`,
				{
					cause: error.toString(),
				}
			);
		}
	}

	public async getEventsBy(
		website_id: number,
		filter: "type" | "name",
		value: string,
		period: TTimePeriod = this._defaultPeriod
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
	public async getMetrics(
		website_id: number,
		period: TTimePeriod = this._defaultPeriod,
		options: { type: TMetric } = { type: "url" }
	): Promise<IMetric[]> {
		options = { ...convertPeriodToTime(period), ...options } as any;

		try {
			await this.verifyAuth();

			const { data } = await this._axios.get(`/website/${website_id}/metrics`, {
				params: options,
			});
			return data;
		} catch (error) {
			throw new Error(
				`GET request to /api/website/${website_id}/metrics failed with params: ${options.toString()}`,
				{
					cause: error.toString(),
				}
			);
		}
	}

	public async getActiveVisitors(website_id: number) {
		try {
			await this.verifyAuth();

			const { data } = await this._axios.get(`/website/${website_id}/active`);
			return data;
		} catch (error) {
			throw new Error(`GET request to /api/website/${website_id}/active failed`, {
				cause: error.toString(),
			});
		}
	}

	/*** ADMIN ONLY FUNCTIONS ***/

	/**
	 * Gets all the user accounts
	 * @returns An array of all the user accounts
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/accounts/index.js Relevant Umami source code}
	 */
	public async getAccounts() {
		try {
			await this.verifyAuth(true);

			const { data } = await this._axios.get("/accounts");
			return data;
		} catch (error) {
			throw new Error(`GET request to /api/accounts failed`, {
				cause: error.toString(),
			});
		}
	}
}
