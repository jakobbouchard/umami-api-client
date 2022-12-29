---
"umami-api": minor
---

### Changed

- [BREAKING] The API client now only returns classes. This means that `getWebsite()` will return a `Website` class, and `getWebsites()` will return an array of `Website` classes. This is a breaking change, but it's better for typings, and it's clearer.
- Updated dependencies.
