import axios, {
	type AxiosInstance,
	type AxiosResponse,
	type InternalAxiosRequestConfig,
} from "axios";
import { Website, type WebsiteData } from "./classes/website";
import { UserAccount, type UserAccountData } from "./classes/user-account";
import { DEFAULT_HTTP_CLIENT_TIMEOUT_MS, DEFAULT_USER_AGENT } from "./defaults";

interface AuthData {
	token: string;
	user: {
		id: string;
		username: string;
		role: string;
		createdAt: number;
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

export default class UmamiApiClient {
	readonly #axios: AxiosInstance;
	readonly #auth: Promise<AxiosResponse<AuthData>>;
	#lastAuthCheck: number = Date.now();

	async getCurrentUser() {
		return (await this.#auth).data.user;
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
		if (!username || !password)
			throw new Error("A username and a password are required");

		this.#axios = axios.create({
			baseURL: `http://${server}/api`,
			timeout: DEFAULT_HTTP_CLIENT_TIMEOUT_MS,
		});

		this.#axios.interceptors.request.use(this.#verifyAuth.bind(this));

		this.#auth = this.#axios.post("/auth/login", { username, password });
	}

	async #verifyAuth(config: InternalAxiosRequestConfig) {
		if (config.url == "/auth/login" || config.url == "/collect") return config;

		const auth = await this.#auth;

		config.headers["Authorization"] = `Bearer ${auth.data.token}`;

		if (config.url == "/auth/verify") return config;

		if (this.#lastAuthCheck + 60 * 60 * 1000 < Date.now()) {
			this.#lastAuthCheck = Date.now();

			try {
				await this.#axios.get("/auth/verify");
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
	async collect(
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
	async collect(
		type: "event",
		payload: EventPayload,
		userAgent?: string,
	): Promise<string>;
	async collect(
		type: "pageview" | "event",
		payload: CollectPayload,
		userAgent: string = DEFAULT_USER_AGENT,
	) {
		if (!userAgent)
			throw new Error(
				"A user agent is required. See https://umami.is/docs/api",
			);

		const { data } = await this.#axios.post<string>(
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
	static async collect(
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
	static async collect(
		server: string,
		type: "event",
		payload: EventPayload,
		userAgent?: string,
	): Promise<string>;
	static async collect(
		server: string,
		type: "pageview" | "event",
		payload: CollectPayload,
		userAgent: string = DEFAULT_USER_AGENT,
	) {
		if (!server) throw new Error("A server is required.");
		server = server.replace(/https?:\/\//, "").replace(/\/$/, "");

		if (!userAgent)
			throw new Error(
				"A user agent is required. See https://umami.is/docs/api",
			);

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
	async getWebsites(options?: { include_all?: boolean; user_id?: number }) {
		const { data } = await this.#axios.get<WebsiteData[]>("/websites", {
			params: options,
		});
		return data.map((data) => new Website(this.#axios, data));
	}

	/**
	 * Gets the first website that gets returned by Umami
	 * @returns The first website
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/websites/index.js Relevant Umami source code}
	 */
	async getWebsite(): Promise<Website>;
	/**
	 * Gets a website by its ID
	 * @param websiteUuid The website's ID
	 * @returns The website
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/websites/[id]/index.js Relevant Umami source code}
	 */
	async getWebsite(id: string): Promise<Website>;
	async getWebsite(id?: string) {
		if (id === undefined) {
			const websites = await this.getWebsites();
			return new Website(this.#axios, websites[0]);
		}

		const { data } = await this.#axios.get<WebsiteData>(`/websites/${id}`);
		return new Website(this.#axios, data);
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
	async getWebsiteBy(key: keyof Website, value: string | number) {
		if (key == "shareId") {
			const { data } = await this.#axios.get<{ id: string; token: string }>(
				`/share/${value}`,
			);
			return await this.getWebsite(data.id);
		}

		if (key == "id") {
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
	 * @param options.shareId A unique string to enable a share url. Set `null` to unshare.
	 * @returns The new website's information
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/websites/index.js#L33-L47 Relevant Umami source code}
	 */
	async createWebsite(options: {
		domain: string;
		name: string;
		sharedId?: string;
	}) {
		const { data } = await this.#axios.post<WebsiteData>("/websites", options);
		return new Website(this.#axios, data);
	}

	/**
	 * Gets all the user accounts (admin only)
	 * @returns An array of all the user accounts
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/accounts/index.js#L15-L19 Relevant Umami source code}
	 */
	async getAccounts() {
		const { data } = await this.#axios.get<UserAccountData[]>("/accounts");
		return data.map((data) => new UserAccount(this.#axios, data));
	}

	/**
	 * Gets a user account (admin only)
	 * @param userId The user ID
	 * @returns The user account
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/accounts/[id]/index.js#L11-L19 Relevant Umami source code}
	 */
	async getAccount(userId: number) {
		const { data } = await this.#axios.get<UserAccountData>(
			`/accounts/${userId}`,
		);
		return new UserAccount(this.#axios, data);
	}

	/**
	 * Creates a user account (admin only)
	 * @param options.username The username
	 * @param options.password The password
	 * @returns The user account
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/accounts/index.js#L21-L37 Relevant Umami source code}
	 */
	async createAccount(options: { username: string; password: string }) {
		const { data } = await this.#axios.post<UserAccountData>(
			"/accounts",
			options,
		);
		return new UserAccount(this.#axios, data);
	}
}
