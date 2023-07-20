import type { AxiosInstance } from "axios";
import {
	DEFAULT_TIME_PERIOD,
	DEFAULT_TIME_UNIT,
	DEFAULT_TIMEZONE,
	DEFAULT_METRIC_TYPE,
} from "../constants";

type TimeUnit = "year" | "month" | "day" | "hour";

type MetricType =
	| "url"
	| "referrer"
	| "title"
	| "query"
	| "event"
	| "browser"
	| "os"
	| "device"
	| "screen"
	| "language"
	| "country"
	| "region"
	| "city";

interface Stats {
	pageviews: { value: number; change: number };
	uniques: { value: number; change: number };
	bounces: { value: number; change: number };
	totaltime: { value: number; change: number };
}

interface PageViews {
	/**
	 * @param t The time period of the data
	 * @param y The amount of page views in the time period
	 */
	pageviews: {
		t: string;
		y: number;
	}[];
	/**
	 * @param t The time period of the data
	 * @param y The amount of sessions in the time period
	 */
	sessions: {
		t: string;
		y: number;
	}[];
}

/**
 * @param x The name of the event
 * @param t The time period of the data
 * @param y The amount of events in the time period
 */
interface Event {
	x: string;
	t: string;
	y: number;
}

/**
 * @param x The metric's value
 * @param y The amount of this metric's value in the period of time
 */
interface Metric {
	x: string | null;
	y: number;
}

interface ActiveVisitor {
	x: number;
}

const HOUR_PERIODS = ["1h", "1hour", "60min", "60minutes"] as const;
type HourPeriod = (typeof HOUR_PERIODS)[number];
const DAY_PERIODS = ["1d", "1day", "24h", "24hours"] as const;
type DayPeriod = (typeof DAY_PERIODS)[number];
const WEEK_PERIODS = ["7d", "7days", "1w", "1week"] as const;
type WeekPeriod = (typeof WEEK_PERIODS)[number];
const MONTH_PERIODS = ["31d", "31days", "1m", "1month"] as const;
type MonthPeriod = (typeof MONTH_PERIODS)[number];

type TimePeriod = HourPeriod | DayPeriod | WeekPeriod | MonthPeriod;

export const convertPeriodToTime = (period: TimePeriod = "24h") => {
	let delta: number;
	if (HOUR_PERIODS.includes(period as HourPeriod)) {
		delta = 60 * 60 * 1000;
	} else if (DAY_PERIODS.includes(period as DayPeriod)) {
		delta = 24 * 60 * 60 * 1000;
	} else if (WEEK_PERIODS.includes(period as WeekPeriod)) {
		delta = 7 * 24 * 60 * 60 * 1000;
	} else if (MONTH_PERIODS.includes(period as MonthPeriod)) {
		delta = 31 * 24 * 60 * 60 * 1000;
	} else {
		throw `Unexpected period provided. Accepted values are : ${[
			...HOUR_PERIODS,
			...DAY_PERIODS,
			...WEEK_PERIODS,
			...MONTH_PERIODS,
		]}`;
	}
	return {
		startAt: Date.now() - delta,
		endAt: Date.now(),
	};
};

export interface WebsiteData {
	id: string;
	name: string;
	domain: string;
	shareId: string | null;
	resetAt: string | null;
	userId: string;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
}

export class Website implements WebsiteData {
	readonly #axios: AxiosInstance;
	readonly id: string;
	readonly name: string;
	readonly domain: string;
	readonly shareId: string | null;
	readonly resetAt: string | null;
	readonly userId: string;
	readonly createdAt: string;
	readonly updatedAt: string;
	readonly deletedAt: string | null;

	constructor(axios: AxiosInstance, data: WebsiteData) {
		this.#axios = axios;
		this.id = data.id;
		this.name = data.name;
		this.domain = data.domain;
		this.shareId = data.shareId;
		this.userId = data.userId;
		this.resetAt = data.resetAt;
		this.createdAt = data.createdAt;
		this.updatedAt = data.updatedAt;
		this.deletedAt = data.deletedAt;
	}

	/**
	 * Updates the website.
	 * @param options.domain The domain name of the website (e.g. umami.is)
	 * @param options.name The name of the website (usually the same as the domain)
	 * @param options.shareId A unique string to enable a share url. Set `null` to unshare.
	 * @returns
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/websites/[id]/index.js#L23-L57 Relevant Umami source code}
	 */
	async update(
		options: RequireAtLeastOne<{
			domain: string;
			name: string;
			shareId: string;
		}>,
	) {
		const { data } = await this.#axios.post<WebsiteData>(
			`/websites/${this.id}`,
			options,
		);
		Object.assign(this, data);
		return this;
	}

	/**
	 * Deletes the website
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/websites/[id]/index.js#L59-L67 Relevant Umami source code}
	 */
	async delete() {
		await this.#axios.delete(`/websites/${this.id}`);
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
	async getStats(options?: {
		period?: TimePeriod;
		url?: string;
		referrer?: string;
		title?: string;
		query?: string;
		event?: string;
		os?: string;
		browser?: string;
		device?: string;
		country?: string;
		region?: string;
		city?: string;
	}) {
		const { data } = await this.#axios.get<Stats>(
			`/websites/${this.id}/stats`,
			{
				params: {
					...convertPeriodToTime(options?.period ?? DEFAULT_TIME_PERIOD),
					url: options?.url,
					referrer: options?.referrer,
					title: options?.title,
					query: options?.query,
					event: options?.event,
					os: options?.os,
					browser: options?.browser,
					device: options?.device,
					country: options?.country,
					region: options?.region,
					city: options?.city,
				},
			},
		);
		return data;
	}

	/**
	 * Resets the website's stats
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/websites/[id]/reset.js Relevant Umami source code}
	 */
	async resetStats() {
		await this.#axios.post(`/websites/${this.id}/reset`);
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
	async getPageviews(options?: {
		period?: TimePeriod;
		unit?: TimeUnit;
		timezone?: string;
		url?: string;
		referrer?: string;
		title?: string;
		os?: string;
		browser?: string;
		device?: string;
		country?: string;
		region?: string;
		city?: string;
	}) {
		const { data } = await this.#axios.get<PageViews>(
			`/websites/${this.id}/pageviews`,
			{
				params: {
					...convertPeriodToTime(options?.period ?? DEFAULT_TIME_PERIOD),
					unit: options?.unit ?? DEFAULT_TIME_UNIT,
					timezone: options?.timezone ?? DEFAULT_TIMEZONE,
					url: options?.url,
					referrer: options?.referrer,
					title: options?.title,
					os: options?.os,
					browser: options?.browser,
					device: options?.device,
					country: options?.country,
					region: options?.region,
					city: options?.city,
				},
			},
		);
		return data;
	}

	/**
	 * Gets the events of the website from a specified time period
	 * @param options.period The time period of events to return
	 * @param options.unit The interval of time/precision of the returned events
	 * @param options.timezone The timezone you're in (defaults to "America/Toronto")
	 * @param options.url The url where the event happened.
	 * @param options.eventName The name of event to request.
	 * @returns An array of events from the specified time period
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/website/[id]/events.js Relevant Umami source code}
	 */
	async getEvents(options?: {
		period?: TimePeriod;
		unit?: TimeUnit;
		timezone?: string;
		url?: string;
		eventName?: string;
	}) {
		const { data } = await this.#axios.get<Event[]>(
			`/websites/${this.id}/events`,
			{
				params: {
					...convertPeriodToTime(options?.period ?? DEFAULT_TIME_PERIOD),
					unit: options?.unit ?? DEFAULT_TIME_UNIT,
					timezone: options?.timezone ?? DEFAULT_TIMEZONE,
					url: options?.url,
					eventName: options?.eventName,
				},
			},
		);
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
	async getMetrics(options?: {
		period?: TimePeriod;
		type?: MetricType;
		url?: string;
		referrer?: string;
		title?: string;
		query?: string;
		event?: string;
		os?: string;
		browser?: string;
		device?: string;
		country?: string;
		region?: string;
		city?: string;
	}) {
		const { data } = await this.#axios.get<Metric[]>(
			`/websites/${this.id}/metrics`,
			{
				params: {
					...convertPeriodToTime(options?.period ?? DEFAULT_TIME_PERIOD),
					type: options?.type ?? DEFAULT_METRIC_TYPE,
					url: options?.url,
					referrer: options?.referrer,
					title: options?.title,
					query: options?.query,
					event: options?.event,
					os: options?.os,
					browser: options?.browser,
					device: options?.device,
					country: options?.country,
					region: options?.region,
					city: options?.city,
				},
			},
		);
		return data;
	}

	/**
	 * Gets the active visitors of a website
	 * @returns
	 * @see {@link https://github.com/umami-software/umami/blob/master/pages/api/websites/[id]/active.js Relevant Umami source code}
	 */
	async getActiveVisitors() {
		const { data } = await this.#axios.get<ActiveVisitor[]>(
			`/websites/${this.id}/active`,
		);
		return data;
	}
}
