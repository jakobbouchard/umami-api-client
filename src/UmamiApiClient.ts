import axios, {
	type AxiosHeaders,
	type RawAxiosRequestHeaders,
	type AxiosInstance,
	type AxiosRequestConfig,
	type AxiosResponse,
} from "axios";
import { convertPeriodToTime } from "./utils/time-periods";

const {
	UMAMI_CLIENT_TIMEOUT_MS,
	UMAMI_CLIENT_USER_AGENT,
	UMAMI_CLIENT_TIME_PERIOD,
	UMAMI_CLIENT_TIME_UNIT,
	UMAMI_CLIENT_TIMEZONE,
	UMAMI_CLIENT_METRIC_TYPE,
} = process.env;

const DEFAULT_HTTP_CLIENT_TIMEOUT_MS = UMAMI_CLIENT_TIMEOUT_MS
	? parseInt(UMAMI_CLIENT_TIMEOUT_MS)
	: 2000;
const DEFAULT_USER_AGENT =
	UMAMI_CLIENT_USER_AGENT ??
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:102.0) Gecko/20100101 Firefox/102.0";
const DEFAULT_TIME_PERIOD = UMAMI_CLIENT_TIME_PERIOD ?? "24h";
const DEFAULT_TIME_UNIT = UMAMI_CLIENT_TIME_UNIT ?? "hour";
const DEFAULT_TIMEZONE = UMAMI_CLIENT_TIMEZONE ?? "America/Toronto";
const DEFAULT_METRIC_TYPE = UMAMI_CLIENT_METRIC_TYPE ?? "url";

function isAxiosHeaders(headers: RawAxiosRequestHeaders | AxiosHeaders): headers is AxiosHeaders {
	return !Object.hasOwn(headers, "common");
}

class Website implements WebsiteData {
	private readonly _apiClient: UmamiApiClient;
	private readonly _axios: AxiosInstance;
	public readonly id: number;
	public readonly websiteUuid: string;
	public userId: number;
	public name: string;
	public domain: string;
	public shareId: string | null;
	public createdAt: string;

	constructor(apiClient: UmamiApiClient, axios: AxiosInstance, data: WebsiteData) {
		this._apiClient = apiClient;
		this._axios = axios;
		Object.assign(this, data);
	}

	/**
	 * Updates the website.
	 * @param options.domain The domain name of the website (e.g. umami.is)
	 * @param options.name The name of the website (usually the same as the domain)
	 * @param options.owner The website's owner's ID (by default, the logged-in's user's)
	 * @param options.enableShareUrl Whether or not to enable public sharing.
	 * @returns
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/websites/[id]/index.js#L23-L57 Relevant Umami source code}
	 */
	public async update(options: {
		domain: string;
		name: string;
		owner?: number;
		enableShareUrl?: boolean;
	}) {
		if (!options.owner) {
			const currentUser = await this._apiClient.getCurrentUser();
			options = {
				...options,
				owner: currentUser.userId,
			};
		}

		const { data } = await this._axios.post<WebsiteData>(`/websites/${this.websiteUuid}`, options);
		Object.assign(this, data);
		return this;
	}

	/**
	 * Deletes the website
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/websites/[id]/index.js#L59-L67 Relevant Umami source code}
	 */
	public async delete() {
		await this._axios.delete(`/websites/${this.websiteUuid}`);
	}

	/**
	 * Gets the stats of the website from a specified time period
	 * @param options.period The time period of stats to return
	 * @param options.url Filter stats by URL
	 * @param options.referrer Filter stats by referrer
	 * @param options.os Filter stats by OS
	 * @param options.browser Filter stats by browser
	 * @param options.device Filter stats by device
	 * @param options.country Filter stats by country
	 * @returns The website's stats from the specified time period
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/websites/[id]/stats.js Relevant Umami source code}
	 */
	public async getStats(options?: {
		period?: TimePeriod;
		url?: string;
		referrer?: string;
		os?: string;
		browser?: string;
		device?: string;
		country?: string;
	}) {
		const { data } = await this._axios.get<Stats>(`/websites/${this.websiteUuid}/stats`, {
			params: {
				...convertPeriodToTime(options?.period ?? DEFAULT_TIME_PERIOD),
				url: options?.url,
				referrer: options?.referrer,
				os: options?.os,
				browser: options?.browser,
				device: options?.device,
				country: options?.country,
			},
		});
		return data;
	}

	/**
	 * Resets the website's stats
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/websites/[id]/reset.js Relevant Umami source code}
	 */
	public async resetStats() {
		await this._axios.post(`/websites/${this.websiteUuid}/reset`);
		return this;
	}

	/**
	 * Gets the pageviews of the website from a specified time period
	 * @param options.period The time period of pageviews to return
	 * @param options.unit The interval of time/precision of the returned pageviews
	 * @param options.tz The timezone you're in (defaults to "America/Toronto")
	 * @param options.url Filter pageviews by URL
	 * @param options.referrer Filter pageviews by referrer
	 * @param options.os Filter pageviews by OS
	 * @param options.browser Filter pageviews by browser
	 * @param options.device Filter pageviews by device
	 * @param options.country Filter pageviews by country
	 * @returns The website's pageviews from the specified time period
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/websites/[id]/pageviews.js Relevant Umami source code}
	 */
	public async getPageviews(options?: {
		period?: TimePeriod;
		unit?: TimeUnit;
		tz?: string;
		url?: string;
		referrer?: string;
		os?: string;
		browser?: string;
		device?: string;
		country?: string;
	}) {
		const { data } = await this._axios.get<PageViews>(`/websites/${this.websiteUuid}/pageviews`, {
			params: {
				...convertPeriodToTime(options?.period ?? DEFAULT_TIME_PERIOD),
				unit: options?.unit ?? DEFAULT_TIME_UNIT,
				tz: options?.tz ?? DEFAULT_TIMEZONE,
				url: options?.url,
				referrer: options?.referrer,
				os: options?.os,
				browser: options?.browser,
				device: options?.device,
				country: options?.country,
			},
		});
		return data;
	}

	/**
	 * Gets the events of the website from a specified time period
	 * @param options.period The time period of events to return
	 * @param options.unit The interval of time/precision of the returned events
	 * @param options.tz The timezone you're in (defaults to "America/Toronto")
	 * @param options.url The url where the event happened.
	 * @param options.event_type The type of event to request.
	 * @returns An array of events from the specified time period
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/website/[id]/events.js Relevant Umami source code}
	 */
	public async getEvents(options?: {
		period?: TimePeriod;
		unit?: TimeUnit;
		tz?: string;
		url?: string;
		event_type?: string;
	}) {
		const { data } = await this._axios.get<Event[]>(`/websites/${this.websiteUuid}/events`, {
			params: {
				...convertPeriodToTime(options?.period ?? DEFAULT_TIME_PERIOD),
				unit: options?.unit ?? DEFAULT_TIME_UNIT,
				tz: options?.tz ?? DEFAULT_TIMEZONE,
				url: options?.url,
				event_type: options?.event_type,
			},
		});
		return data;
	}

	/**
	 * Gets a type of metrics of the website from a specified time period
	 * @param options.period The time period of events to return
	 * @param options.type The type of metric to get. Defaults to url
	 * @param options.url Filter metrics by URL
	 * @param options.referrer Filter metrics by referrer
	 * @param options.os Filter metrics by OS
	 * @param options.browser Filter metrics by browser
	 * @param options.device Filter metrics by device
	 * @param options.country Filter metrics by country
	 * @returns An array of metrics from the specified time period
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/websites/[id]/metrics.js Relevant Umami source code}
	 */
	public async getMetrics(options?: {
		period?: TimePeriod;
		type?: MetricType;
		url?: string;
		referrer?: string;
		os?: string;
		browser?: string;
		device?: string;
		country?: string;
	}) {
		const { data } = await this._axios.get<Metric[]>(`/websites/${this.websiteUuid}/metrics`, {
			params: {
				...convertPeriodToTime(options?.period ?? DEFAULT_TIME_PERIOD),
				type: options?.type ?? DEFAULT_METRIC_TYPE,
				url: options?.url,
				referrer: options?.referrer,
				os: options?.os,
				browser: options?.browser,
				device: options?.device,
				country: options?.country,
			},
		});
		return data;
	}

	/**
	 * Gets the active visitors of a website
	 * @returns
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/websites/[id]/active.js Relevant Umami source code}
	 */
	public async getActiveVisitors() {
		const { data } = await this._axios.get<ActiveVisitor[]>(`/websites/${this.websiteUuid}/active`);
		return data;
	}
}

class UserAccount implements UserAccountData {
	private readonly _axios: AxiosInstance;
	public readonly id: number;
	public username: string;
	public isAdmin: boolean;
	public readonly createdAt: string;
	public updatedAt: string;
	public accountUuid: string;

	constructor(axios: AxiosInstance, data: UserAccountData) {
		this._axios = axios;
		Object.assign(this, data);
	}

	/**
	 * Updates a user account
	 * @param options.username New username (admin only)
	 * @param options.password New password
	 * @returns The user account
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/accounts/[id]/index.js#L21-L53 Relevant Umami source code}
	 */
	public async update(options: { username: string; password: string }) {
		const { data } = await this._axios.post(`/accounts/${this.id}`, options);
		Object.assign(this, data);
		return this;
	}

	/**
	 * Updates a user account password
	 * @param options.current_password Current password
	 * @param options.new_password New password
	 * @returns The user account
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/accounts/[id]/password.js Relevant Umami source code}
	 */
	public async changePassword(options: { current_password: string; new_password: string }) {
		await this._axios.post(`/accounts/${this.accountUuid}/password`, options);
		return this;
	}

	/**
	 * Deletes the user account (admin only)
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/accounts/[id]/index.js#L55-L63 Relevant Umami source code}
	 */
	public async delete() {
		await this._axios.delete(`/accounts/${this.id}`);
	}
}

export default class UmamiApiClient {
	private readonly _axios: AxiosInstance;
	private readonly _auth: Promise<AxiosResponse<AuthData>>;
	private _lastAuthCheck: number = Date.now();

	public async getCurrentUser() {
		return (await this._auth).data.user;
	}

	/**
	 * @param server The Umami installation hostname (e.g. app.umami.is). The protocol, if present, will be removed.
	 * @param username Username of the user you want to use.
	 * @param password Password of the user you want to use.
	 * @returns An authenticated class instance
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/auth/login.js Relevant Umami source code}
	 */
	constructor(server: string, username: string, password: string) {
		if (!server) throw new Error("A server hostname is required");
		server = server.replace(/https?:\/\//, "").replace(/\/$/, "");
		if (!username || !password) throw new Error("A username and a password are required");

		this._axios = axios.create({
			baseURL: `https://${server}/api`,
			timeout: DEFAULT_HTTP_CLIENT_TIMEOUT_MS,
		});

		this._axios.interceptors.request.use(this._verifyAuth.bind(this));

		this._auth = this._axios.post("/auth/login", { username, password });
	}

	private async _verifyAuth(config: AxiosRequestConfig) {
		if (config.url == "/auth/login" || config.url == "/collect") return config;

		const auth = await this._auth;

		isAxiosHeaders(config.headers) &&
			config.headers.set("Authorization", `Bearer ${auth.data.token}`);

		if (config.url == "/auth/verify") return config;

		if (this._lastAuthCheck + 60 * 60 * 1000 < Date.now()) {
			this._lastAuthCheck = Date.now();

			try {
				await this._axios.get("/auth/verify");
			} catch (error) {
				console.error({ axiosConfig: config });
				throw error;
			}
		}

		return config;
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
		payload: PageViewPayload,
		userAgent?: string,
	): Promise<string>;
	/**
	 * Collects an event
	 * @param type The type of event to send
	 * @param payload The payload of the event
	 * @param userAgent Value of the User-Agent header. Necessary for platform detection. Defaults to Firefox on Mac OS on a laptop
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/collect.js#L77 Relevant Umami source code}
	 */
	public async collect(type: "event", payload: EventPayload, userAgent?: string): Promise<string>;
	public async collect(
		type: "pageview" | "event",
		payload: CollectPayload,
		userAgent: string = DEFAULT_USER_AGENT,
	) {
		if (!userAgent) throw new Error("A user agent is required. See https://umami.is/docs/api");

		const { data } = await this._axios.post<string>(
			"/collect",
			{ type, payload },
			{ headers: { "User-Agent": userAgent } },
		);
		return data;
	}

	/**
	 * Collects a pageview
	 * @param server The Umami installation hostname (e.g. app.umami.is). The protocol, if present, will be removed.
	 * @param type The type of event to send
	 * @param payload The payload of the pageview
	 * @param userAgent Value of the User-Agent header. Necessary for platform detection. Defaults to Firefox on Mac OS on a laptop
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/collect.js#L75 Relevant Umami source code}
	 */
	public static async collect(
		server: string,
		type: "pageview",
		payload: PageViewPayload,
		userAgent?: string,
	): Promise<string>;
	/**
	 * Collects an event
	 * @param server The Umami installation hostname (e.g. app.umami.is). The protocol, if present, will be removed.
	 * @param type The type of event to send
	 * @param payload The payload of the event
	 * @param userAgent Value of the User-Agent header. Necessary for platform detection. Defaults to Firefox on Mac OS on a laptop
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/collect.js#L77 Relevant Umami source code}
	 */
	public static async collect(
		server: string,
		type: "event",
		payload: EventPayload,
		userAgent?: string,
	): Promise<string>;
	public static async collect(
		server: string,
		type: "pageview" | "event",
		payload: CollectPayload,
		userAgent: string = DEFAULT_USER_AGENT,
	) {
		if (!server) throw new Error("A server is required.");
		server = server.replace(/https?:\/\//, "").replace(/\/$/, "");

		if (!userAgent) throw new Error("A user agent is required. See https://umami.is/docs/api");

		const { data } = await axios.post<string>(
			`https://${server}/api/collect`,
			{ type, payload },
			{ headers: { "User-Agent": userAgent } },
		);
		return data;
	}

	/**
	 * Gets tracked websites
	 * @param options.include_all Whether or not to include all websites (admin only)
	 * @param options.user_id The user to query websites from (admin only, if not your own user id)
	 * @returns An array of tracked websites
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/websites/index.js#L20-L31 Relevant Umami source code}
	 */
	public async getWebsites(options?: { include_all?: boolean; user_id?: number }) {
		const { data } = await this._axios.get<WebsiteData[]>("/websites", {
			params: options,
		});
		return data.map((data) => new Website(this, this._axios, data));
	}

	/**
	 * Gets the first website that gets returned by Umami
	 * @returns The first website
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/websites/index.js Relevant Umami source code}
	 */
	public async getWebsite(): Promise<Website>;
	/**
	 * Gets a website by its UUID (not ID)
	 * @param websiteUuid The website's UUID (not ID)
	 * @returns The website
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/websites/[id]/index.js Relevant Umami source code}
	 */
	public async getWebsite(websiteUuid: string): Promise<Website>;
	public async getWebsite(websiteUuid: string = null) {
		if (websiteUuid == null) {
			const websites = await this.getWebsites();
			return new Website(this, this._axios, websites[0]);
		}

		const { data } = await this._axios.get<WebsiteData>(`/websites/${websiteUuid}`);
		return new Website(this, this._axios, data);
	}

	/**
	 * Gets a website by a property
	 * @param key The property to check
	 * @param value The value to check the property against
	 * @returns The website
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/websites/index.js Relevant Umami source code}
	 *
	 * @example
	 * Get a website by domain name
	 * ```ts
	 * const website = await instance.getWebsiteBy("domain", "example.com");
	 * ```
	 */
	public async getWebsiteBy(key: keyof Website, value: string | number) {
		if (key == "shareId") {
			const { data } = await this._axios.get<{ id: string; token: string }>(`/share/${value}`);
			return await this.getWebsite(data.id);
		}

		if (key == "websiteUuid") {
			return await this.getWebsite(value as string);
		}

		const websites = await this.getWebsites();
		const website = websites.find((website) => website[key] == value);
		if (!website) {
			throw Error("Could not find website");
		}
		return website;
	}

	/**
	 * Creates a new website and returns its information.
	 * @param options.domain The domain name of the website (e.g. umami.is)
	 * @param options.name The name of the website (usually the same as the domain)
	 * @param options.owner The website's owner's ID (by default, the logged-in's user's)
	 * @param options.enableShareUrl Whether or not to enable public sharing.
	 * @returns The new website's information
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/websites/index.js#L33-L47 Relevant Umami source code}
	 */
	public async createWebsite(options: {
		domain: string;
		name: string;
		owner?: number;
		enableShareUrl?: boolean;
	}) {
		if (!options.owner) {
			const currentUser = await this.getCurrentUser();
			options = {
				...options,
				owner: currentUser.userId,
			};
		}
		const { data } = await this._axios.post<WebsiteData>("/websites", options);
		return new Website(this, this._axios, data);
	}

	/**
	 * Gets all the user accounts (admin only)
	 * @returns An array of all the user accounts
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/accounts/index.js#L15-L19 Relevant Umami source code}
	 */
	public async getAccounts() {
		const { data } = await this._axios.get<UserAccountData[]>("/accounts");
		return data.map((data) => new UserAccount(this._axios, data));
	}

	/**
	 * Gets a user account (admin only)
	 * @param userId The user ID
	 * @returns The user account
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/accounts/[id]/index.js#L11-L19 Relevant Umami source code}
	 */
	public async getAccount(userId: number) {
		const { data } = await this._axios.get<UserAccountData>(`/accounts/${userId}`);
		return new UserAccount(this._axios, data);
	}

	/**
	 * Creates a user account (admin only)
	 * @param options.username The username
	 * @param options.password The password
	 * @returns The user account
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/accounts/index.js#L21-L37 Relevant Umami source code}
	 */
	public async createAccount(options: { username: string; password: string }) {
		const { data } = await this._axios.post<UserAccountData>("/accounts", options);
		return new UserAccount(this._axios, data);
	}
}
