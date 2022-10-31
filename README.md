# Umami API Client

![GitHub Workflow Status](https://img.shields.io/github/workflow/status/jakobbouchard/umami-api-client/api-client-ci?label=tests&style=flat-square)
![npm](https://img.shields.io/npm/v/umami-api?style=flat-square)
![npm bundle size](https://img.shields.io/bundlephobia/minzip/umami-api?style=flat-square)
![npm downloads](https://img.shields.io/npm/dt/umami-api?style=flat-square)

🍙 Simple, tiny (<12.5kB gzipped), API client for Umami analytics.

## Installation

```shell
npm install umami-api
```

## Examples

### Without classes

```ts
import UmamiAPIClient from "umami-api";

const umami = new UmamiAPIClient("stats.example.com", "username", "password", false);

const newWebsite = await umami.createWebsite({
	domain: "test.com",
	name: "test.com",
	enableShareUrl: false,
});

const pageviews = await umami.getPageviews(newWebsite.websiteUuid);
const metrics = await umami.getMetrics(newWebsite.websiteUuid);
```

### With classes

```ts
import UmamiAPIClient from "umami-api";

const umami = new UmamiAPIClient("stats.example.com", "username", "password", true);

const newWebsite = await umami.createWebsite({
	domain: "test.com",
	name: "test.com",
	enableShareUrl: false,
});

const pageviews = await newWebsite.getPageviews();
const metrics = await newWebsite.getMetrics();
```
