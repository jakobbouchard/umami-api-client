import axios, {
	type AxiosHeaders,
	type RawAxiosRequestHeaders,
	type AxiosInstance,
	type AxiosRequestConfig,
	type AxiosResponse,
} from "axios";
import { Website, type WebsiteData } from "./classes/website";
import { UserAccount, type UserAccountData } from "./classes/user-account";
import { DEFAULT_HTTP_CLIENT_TIMEOUT_MS, DEFAULT_USER_AGENT } from "./defaults";

interface AuthData {
	token: string;
	user: {
		userId: number;
		username: string;
		isAdmin: boolean;
		accountUuid: string;
		iat?: number;
		shareToken?: string;
	};
}

interface PageViewPayload {
	website: string;
	url: string;
	referrer?: string;
	hostname: string;
	language?: string;
	screen?: string;
}

interface EventPayload {
	website: string;
	url: string;
	referrer?: string;
	hostname: string;
	language?: string;
	screen?: string;
	event_name: string;
	event_data: string;
}

type CollectPayload = PageViewPayload | EventPayload;

function isAxiosHeaders(headers?: RawAxiosRequestHeaders | AxiosHeaders): headers is AxiosHeaders {
	return !!headers && !Object.hasOwn(headers, "common");
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
	public async getWebsite(websiteUuid?: string) {
		if (websiteUuid === undefined) {
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
