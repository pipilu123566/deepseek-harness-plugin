# Validation coverage

[中文](validation.md) | English

This record covers Remote Desktop 0.4.2 on DeepSeek Harness 0.2.1-rc.5. The controlled host is an Apple Silicon Mac running macOS 13+. Client-side keyboard mapping does not add Windows/Linux controlled hosts. See the Release for the final commit, tag, package SHA-256 and public-download verification.

## Features and tests

- Display, quality and connection details live in the top bar. A top-right phone icon opens the access dialog; closing/backgrounding clears this page’s URL and QR code.
- The separate shortcut-input pane/button is removed; existing direct keyboard input remains. No new IME path or system-password handling was added.
- Wheel scrolls remote content; Shift-wheel scrolls horizontally; Ctrl/Command-wheel zooms. Move view mode pans with drag or wheel.
- Auto maps Windows/Linux client Control/Windows modifiers to Mac Command/Control; Mac clients retain native keys. PC and Raw modes are also selectable. Use Raw for terminal Control chords; browser/system-reserved shortcuts may not be forwarded.
- Locale cleanup fixes loss of the Desktop sidebar entry after hot updates, with a one-time namespace migration for pages retaining the old dictionary.

All 27 automated checks cover desktop mappings, two dialog event cases, two client remount cases, authentication, permissions, exclusive leases, signaling/input isolation, cancellation, input coalescing and touch-zoom geometry. Three actual app.js event replays (PC Ctrl+C, Shift-wheel and Command-wheel) also pass. Their DOM/DataChannel fixtures are not physical-device acceptance.

The final package must be built from a clean fixed commit and compared file by file. Release verification covers isolated Loader/owner login/assets, anonymous rejection, uninstall 404 and reinstall, followed by anonymous download/checksum verification and installation in another fresh profile. Results and checksum belong in the Release; a maintainer’s source-link installation does not substitute for the public package.

## Device evidence

On 2026-11-01, after reloading and checking the top controls, shortcut-input removal and another computer’s controls, the user confirmed that layout and keyboard/mouse worked normally. Direct input already worked; this is not described as an input-bug fix. Client device, OS and browser details were not recorded, so not every combination is covered. Earlier user checks confirmed phone connection, operation, disconnect, pinch zoom, both displays and improved Responsive mode.

The sidebar fix passed repeated mounts against the target Host’s actual LocaleRuntime and repeated Desktop hot updates retained one entry. These device observations cover the runtime code included in this release; documentation/metadata updates are not a new full device test.

## Native helper and historical performance

Version 0.4.2 reuses the unchanged 0.4.1 native helper, checking the archive SHA-256 before extraction and application signature before use. Capture quality, authentication, leases and wake policies are unchanged.

Historical 0.4.1 local Chrome samples received 2940×1912 in Detail and 2214×1440 in Responsive, with successful mode changes. Approximately 29/30 FPS, 69/22ms receive buffering and 4/1ms network RTT were local samples, not mobile end-to-end guarantees. Prior throttled-input replays verified stale-motion coalescing and reliable release handling, not arbitrary network performance.

## Limits and media provenance

Real iPad, every client/network combination, TURN, full system wake, lock-screen password entry/unlock and secure system inputs have not been individually accepted. Ordinary input does not establish Touch ID or pre-login FileVault support. The helper is ad hoc signed and not notarized; each Mac must grant screen-recording and Accessibility access. Audio, file transfer and cross-device clipboard synchronization are not provided.

The 0.4.2 homepage images are bilingual workflow illustrations, not UI recordings. AI_Animation’s dynamic-archify workflow layout produced SVG, rasterized offline as PNG; both languages were visually inspected. The 0.4.1 UI image and 0.3.6 animation remain clearly historical. Publication checks read back public media bytes and README references; HTTP checks do not count as visual GitHub-page acceptance when browser use is unavailable.
