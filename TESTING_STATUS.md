# Testing Status

_Last updated: 2026-02-13_

## Overall

✅ **All automated suites passing**

- `npm run test` → **PASS**
- `npm run test:e2e` → **PASS**

## Snapshot

- **Server unit:** 1 file / 3 tests passing
- **Server integration:** 6 files / 25 tests passing
- **Client unit/component:** 1 file / 3 tests passing
- **E2E (Playwright):** 3 tests passing
- **Total passing tests:** **34**

## Commands

```bash
npm run test
npm run test:e2e
```

## Notes

- Integration suites use `weather_app_test` database and run migrations before execution.
- Some negative-path tests intentionally log handled errors (expected behavior).
