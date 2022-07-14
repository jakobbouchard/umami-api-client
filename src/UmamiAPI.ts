import axios from "axios";
import { TTimePeriod, convertPeriodToTime } from "./utils/time-periods";

type TUnit = "year" | "month" | "day" | "hour";
type TMetric = "url" | "referrer" | "browser" | "os" | "device" | "country" | "event";

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
	pageviews: { t: string; y: number }[];
	sessions: { t: string; y: number }[];
}

interface IEvent {
	x: string;
	t: string;
	y: number;
}

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

	constructor(server: string) {
		if (!server) {
			throw new Error("A server hostname is required");
		}
		this._server = server.replace(/https?:\/\//, "");
	}

	collect(type: "event", payload: IEventPayload): void;
	collect(type: "pageview", payload: IPageViewPayload): void;
	collect(type: "pageview" | "event", payload: IEventPayload | IPageViewPayload) {
		return axios.post(`https://${this._server}/api/auth/login`, { type, payload });
	}
}

export default class UmamiAPI extends BaseUmamiAPI {
	async auth(username: string, password: string) {
		try {
			const { data, status } = await axios.post(`https://${this._server}/api/auth/login`, {
				username,
				password,
			});

			if (!data.token || status < 200 || status >= 300) {
				throw new Error(`Authentication failed - Status: ${status} - Response: ${data}`);
			}

			return new AuthenticatedUmamiAPI(this._server, data.token);
		} catch (error) {
			console.error(error);
			throw new Error(`Login failed`, { cause: error });
		}
	}
}

class AuthenticatedUmamiAPI extends BaseUmamiAPI {
	private _token: string;

	constructor(server: string, token: string) {
		super(server);
		this._token = token;
	}

	private async post(endpoint: string, options?: any) {
		const url = `https://${this._server}/api${endpoint}`;

		try {
			const { data, status } = await axios.post(url, options, {
				headers: { Authorization: `Bearer ${this._token}` },
			});
			if (status < 200 || status >= 300) {
				throw new Error(`Status code: ${status} - Response: ${data}`);
			}
			return data;
		} catch (error) {
			console.error(error);
			throw new Error(`POST request to ${url} failed`, { cause: error });
		}
	}

	private async get(endpoint: string, options?: any) {
		const params = options ? new URLSearchParams(options).toString() : "";
		const url = `https://${this._server}/api${endpoint}?${params}`;

		try {
			const { data, status } = await axios.get(url, {
				headers: { Authorization: `Bearer ${this._token}` },
			});
			if (status < 200 || status >= 300) {
				throw new Error(`Status code: ${status} - Response: ${data}`);
			}
			return data;
		} catch (error) {
			console.error(error);
			throw new Error(`GET request to ${url} failed`, { cause: error });
		}
	}

	// POST /api/website
	async createWebsite(options: {
		domain: string;
		name: string;
		enable_share_url?: boolean;
		public?: boolean;
	}) {
		return await this.post("/website", options);
	}

	// GET /api/websites
	async getWebsites(): Promise<ITrackedWebsite[]> {
		return await this.get("/websites");
	}

	// GET /api/website/{id}/stats
	async getStats(website_id: number, period: TTimePeriod = "1d"): Promise<IStats> {
		return await this.get(`/website/${website_id}/stats`, {
			...convertPeriodToTime(period),
		});
	}

	// GET /api/website/{id}/pageviews
	async getPageViews(
		website_id: number,
		period: TTimePeriod = "1d",
		options: { unit: TUnit; tz: string } = { unit: "hour", tz: "America/Toronto" }
	): Promise<IPageViews> {
		return await this.get(`/website/${website_id}/pageviews`, {
			...convertPeriodToTime(period),
			...options,
		});
	}

	// GET /api/website/{id}/events
	async getEvents(
		website_id: number,
		period: TTimePeriod = "1d",
		options: { unit: TUnit; tz: string } = { unit: "hour", tz: "America/Toronto" }
	): Promise<IEvent[]> {
		return await this.get(`/website/${website_id}/events`, {
			...convertPeriodToTime(period),
			...options,
		});
	}

	// GET /api/website/{id}/metrics
	async getMetrics(
		website_id: number,
		period: TTimePeriod = "1d",
		options: { type: TMetric } = { type: "url" }
	): Promise<IMetric[]> {
		return await this.get(`/website/${website_id}/metrics`, {
			...convertPeriodToTime(period),
			...options,
		});
	}
}
