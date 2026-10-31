# Validation coverage

[中文](validation.md) | English

Version 0.3.6 is the first public preview, prepared from local version 0.3.5. Host, Client, web UI, input protocol and native helper retain the implementation. Changes cover public metadata, licensing, bilingual documentation, independent source layout and sanitized deployment examples. The helper has been stripped of debug symbols containing local build paths and ad hoc signed again; its executable code section is unchanged. Publishing does not replace the running local 0.3.5 installation.

## Existing functional evidence

- On DSH 0.2.1-rc.5 and an Apple Silicon Mac, real video was received at 1920×1080. A Mac validation window confirmed Chinese text, special characters, a synthetic test password and a mouse click. Disconnect and reconnect succeeded.
- A user confirmed phone connection, operation, disconnect, and version 0.3.3's zoom buttons and pinch gestures. The browser was categorized as WeChat or another embedded browser; the exact device and network were not recorded.
- Checks at 390×844 and 820×1180 used browser emulation and do not establish real iPad coverage.
- Version 0.3.5 reproduced capture failure with a sleeping display on the same locked Mac. Waking the display restored 1920×1080 capture startup; the helper and wake assertion exited on disconnect. A full phone retest of that fix is still pending.

## Public release checks

The 13 project checks cover authentication, permissions, exclusive connections, signaling/input isolation, stale connection cleanup, zoom anchors and coordinates, display-wake ordering, disconnect and cancellation cleanup. Release preparation packs a fixed commit, compares the artifact against Git, and installs it in an isolated DSH_HOME/profile to check the real Loader, owner login, protected APIs, web resources, uninstall and reinstall. The Release notes record the final commit, SHA-256 and public-download verification results.

## Unverified scenarios and limits

Real iPad behavior, all browsers and different networks, TURN, full system wake, lock-screen password entry/unlock and system secure-input cases are not exhaustively validated. Ordinary password-field success does not prove Touch ID or FileVault support. The helper is ad hoc signed and not notarized; each target Mac needs its own permission grants.
