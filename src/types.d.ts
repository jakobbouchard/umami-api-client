type TimePeriod =
	| "1h"
	| "1hour"
	| "60min"
	| "60minutes"
	| "1d"
	| "1day"
	| "24h"
	| "24hours"
	| "7d"
	| "7days"
	| "1w"
	| "1week"
	| "31d"
	| "31days"
	| "1m"
	| "1month";

type TimeUnit = "year" | "month" | "day" | "hour";

type MetricType =
	| "url"
	| "referrer"
	| "browser"
	| "os"
	| "device"
	| "country"
	| "event"
	| "language"
	| "utm_source"
	| "utm_medium"
	| "utm_campaign"
	| "utm_content"
	| "utm_term"
	| "ref";

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

interface Stats {
	pageviews: {
		value: number;
		change: number;
	};
	uniques: {
		value: number;
		change: number;
	};
	bounces: {
		value: number;
		change: number;
	};
	totaltime: {
		value: number;
		change: number;
	};
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

interface WebsiteData {
	id: number;
	websiteUuid: string;
	userId: number;
	name: string;
	domain: string;
	shareId: string | null;
	createdAt: string;
}

interface UserAccountData {
	id: number;
	username: string;
	isAdmin: boolean;
	createdAt: string;
	updatedAt: string;
	accountUuid: string;
}
