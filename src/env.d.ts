declare global {
	namespace NodeJS {
		interface ProcessEnv {
			UMAMI_CLIENT_TIMEOUT_MS?: string;
			UMAMI_CLIENT_USER_AGENT?: string;
			UMAMI_CLIENT_TIME_PERIOD?: TimePeriod;
			UMAMI_CLIENT_TIME_UNIT?: TimeUnit;
			UMAMI_CLIENT_TIMEZONE?: string;
			UMAMI_CLIENT_METRIC_TYPE?: MetricType;
		}
	}

	// From: https://learn.microsoft.com/en-us/javascript/api/@azure/keyvault-certificates/requireatleastone?view=azure-node-latest
	type RequireAtLeastOne<T> = {
		[K in keyof T]-?: Required<Pick<T, K>> &
			Partial<Pick<T, Exclude<keyof T, K>>>;
	}[keyof T];
}

export {};
