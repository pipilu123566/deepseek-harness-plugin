# Contributing

Bug reports and focused pull requests are welcome. Describe the Harness version, operating system, installation source, expected behavior and steps to reproduce. Remove credentials, account identifiers and real balance amounts from logs and screenshots.

Use the pinned Node and pnpm versions, install with the lockfile and run `pnpm test`. Tests must use fixtures and must not read personal credentials or contact live provider APIs. Keep provider queries on the host and use published provider interfaces with strict destination checks.

For package or UI changes, test the packed bundle in an isolated Harness profile. Record the tested host version and distinguish simulated data from live provider results. Do not change the user's normal desktop profile for tests. No particular response time or release date is promised.
