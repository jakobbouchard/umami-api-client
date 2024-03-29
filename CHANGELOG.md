# Changelog

## 0.7.3

### Patch Changes

- Remove ko-fi from funding

## 0.7.2

### Patch Changes

- [`95d0783`](https://github.com/jakobbouchard/umami-api-client/commit/95d07835a8d4adcfbc349ac17680e9d5001eff78) Thanks [@jakobbouchard](https://github.com/jakobbouchard)! - Bump vitest

## 0.7.1

### Patch Changes

- [`db93efa`](https://github.com/jakobbouchard/umami-api-client/commit/db93efacbdd8aa65eb684e0b4d6b985d27e6e253) Thanks [@jakobbouchard](https://github.com/jakobbouchard)! - Update dependencies

- Update dependencies

## 0.7.0

### Changed

- The API client now only returns classes. This means that `getWebsite()` will return a `Website` class, and `getWebsites()` will return an array of `Website` classes. This is a breaking change, but it's better for typings, and it's clearer.
- Default parameters (user agent, time period, time unit, timezone and metric type) are now defined using environment variables. They cannot be set using functions anymore. This is a breaking change.
- Errors are not caught anymore, so you can handle them yourself. This is a breaking change.
- The package is now bundled using tsup, instead of microbundle. This might break compatibility with some environments, but it's smaller and faster.
- Updated dependencies.

### Removed

- The website and account functions (except those to get them) have been removed, in favour of classes. This is a breaking change.

## 0.6.2

### Changed

- Updated dependencies.

## 0.6.1

### Fixed

- Uh, after adding husky, the package wouldn't install anymore, so I fixed that!

## 0.6.0 ⚠️ SKIP THIS RELEASE

**IMPORTANT**: This release cannot be installed due to `husky install` being run in the `postinstall` script instead of `prepare`. As such, please upgrade to the 0.6.1 release ASAP.

**WARNING**: This release contains a lot of breaking changes due to the fact that Umami's API moved from using IDs to UUIDs for most operations. As such, you should update your code to use UUIDs instead of IDs. Also, some parameters changed from `snake_case` to `camelCase`, due to changes in the Umami API. Sadly, it's not super consistent, so some items still require `snake_case`.

### Added

- Hound CI for PRs.
- Convert tests from jest to vitest.
- ESLint, Prettier, Husky.
- Auto-signing version tags.

### Changed

- Most functions now require the website UUID instead of its ID, per Umami's new API.
- Changing an account's password now requires its UUID instead of its ID.
- Most options now take `camelCase` params instead of `snake_case`.
- Update axios.

### Removed

- `getEventsByName(...)` has been removed, since events now use names by default.

## 0.5.2

### Added

- Axios timeout, in case the server is slow.
- Basic tests!

### Fixed

- Makes `returnClasses` required. It's better for typings, and it's clearer.

## 0.5.1

### Fixed

- Sometimes `_richError` didn't show the options.

## 0.5.0

### Added

- Support for UTM parameters in `getMetrics`.

### Changed

- Makes `returnClasses` required. It's better for typings, and it's clearer.

## 0.4.2

### Fixed

- Correctly type the return values with the introduction of `returnClasses` in 0.4.0.
- Won't die when `options` is not provided.

## 0.4.1

Awkward... Forgot to build before publishing...

## 0.4.0

### Added

- `returnClasses` options in API Client constructor. Enabling this returns classes when getting websites or accounts. Example:

```ts
import UmamiAPIClient from "umami-api";

const umami = new UmamiAPIClient("stats.example.com", "admin", "1234");
const website = umami.getWebsite();
website.update({
	domain: "test.com",
});
```

### Changed

- [BREAKING] `getEventsByName(...)`'s `name` parameter has been removed from its `options` object, because its uh a bit more logic isn't it?
- Now uses [`microbundle`](https://github.com/developit/microbundle) for bundling, which should help with compatibility.

## 0.3.1 - 2022-07-18

### Fixed

- `changePassword(...)` pointed to the wrong endpoint.

## 0.3.0 - 2022-07-15

This release contains a small breaking change. And all the available endpoints now!

### Added

- `getEventsByName(...)` – Get events by their name/value. Now with full info!
- [**Admin only**] `createAccount(...)` – Create a user account.
- `updateAccount(...)` – Update account info. `username` and `is_admin` can only be changed by admins.
- `changePassword(...)` – Change your password.
- [**Admin only**] `getAccount(...)` – Get a user account.
- [**Admin only**] `deleteAccount(...)` – Delete a user account.
- All the available API options.

### Removed

- [BREAKING] `getEventsBy(...)` is gone, since you can request the event type in the regular `getEvents(...)` function now.
- Does not check manually for admin rights anymore, since the API does it for us.

## 0.2.0 - 2022-07-15

This release contains a LOT of breaking changes. Also a lot of new stuff!

### Added

- `static UmamiAPIClient.collect(...)` – Collect pageviews and events without initializing a client.
- `setDefaultUnit(...)` – Set the default unit of time when getting pageviews or events.
- `setDefaultTZ(...)` – Set the default timezone when getting pageviews or events.
- `setDefaultMetricType(...)` – Set the default type when getting metrics.
- `setDefaultUserAgent(...)` – Set the default user agent when calling `collect(...)` on an instance. Does **not** affect the new static method.
- `getWebsiteBy(...)` – Replaces part of the functionality of `getWebsite(...)`.

### Changed

- [BREAKING] Authentication is done directly in the constructor now.
- [BREAKING] There previously were 2 classes, now there is only one.
- [BREAKING] Rename `getPageViews(...)` to `getPageviews(...)`
- [BREAKING] The `period` parameter is now in the options, to make it optional. This affects `getStats(...)`, `getPageviews(...)`, `getEvents(...)`, `getEventsBy(...)` and `getMetrics(...)`.
- [BREAKING] The `getWebsite(...)` function was split.
- Better error messages

### Removed

- `getDefaultPeriod(...)` as it's unnecessary.

## 0.1.5 - 2022-07-15

### Changed

- Remove explicit return type in `auth(...)` function.

## 0.1.4 - 2022-07-15

### Added

- **Lots** of JSDoc comments. Not everything is done or typed yet however, especially the new stuff.
- The authentication token gets checked about every hour.
- `setDefaultPeriod(...)` and `getDefaultPeriod()` – Set and get the default time period. Defaults to `24h`.
- `getCurrentUser()` – Get the currently logged in user's info.
- `updateWebsite(...)` – Update a website's name, domain or enable the share URL.
- `getWebsite(...)` – Get a single website, either by specifying a property it has, its ID, or nothing (returns the first website in the list).
- `resetWebsite(...)` – Reset a website by ID.
- `deleteWebsite(...)` – Delete a website by ID.
- `getEventsBy(...)` – Get the total number of events in a time period, filtered by their value or their type.
- `getActiveVisitors(...)` – Get the number of active visitors.
- `getActiveVisitors(...)` – Get the number of active visitors.
- [**Admin only**] `getAccounts(...)` – Get all of the user accounts

## 0.1.3 - 2022-07-14

### Changed

- Fix package name in README.

## 0.1.2 - 2022-07-14

### Changed

- Fix README instructions.

## 0.1.1 - 2022-07-14

### Fixed

- Fix `collect(...)` function. It was pointing to the wrong endpoint and needed a "User-Agent" header.

## 0.1.0 - 2022-07-14

### Added

- Initial release
