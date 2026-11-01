# Validation coverage

[中文](validation.md) | English

This record covers 0.4.1 on DeepSeek Harness 0.2.1-rc.5 and Apple Silicon Macs running macOS 13 or later. Release notes record the final commit, artifact SHA-256 and public-download verification.

## Functional and package checks

All 18 project checks cover authentication, permissions, exclusive connections, signaling/input isolation, stale connection cleanup, zoom geometry, display/mode allowlists, missing-display rejection, display-wake ordering, cancellation, motion/scroll coalescing and reliable release handling.

Responsive mode captures up to 1440p and prioritizes frame rate; Detail mode captures native pixels up to 3840×2160 and prioritizes resolution. Display selection remains independent. The manual resolution parameter was removed from both the page and connection API, so old pages must be reloaded after upgrading.

The local 0.4.1 tarball passed isolated profile installation, real Loader activation, owner login, web assets, protected APIs, 404 routes after uninstall and successful reinstall. The running Mac was updated and enabled without restarting the Host; its 29 installed files matched that local artifact. Public release preparation rebuilds from a fixed commit and verifies the final assets separately; identical version numbers do not imply identical documentation or artifact bytes.

## Device and browser evidence

- Earlier versions received real desktop video. A Mac validation window confirmed Unicode text, special characters, a synthetic test password and mouse input. A user confirmed phone connection, operation, disconnect and pinch zoom.
- Version 0.4.0 checked all four capture sizes on both physical displays. The user subsequently confirmed improved phone clarity and operation of both the built-in and external display.
- Version 0.4.1 Chrome received Detail video at 2940×1912 and Responsive video at 2214×1440; mode changes reconnected successfully. At 390 CSS px there was no horizontal overflow and only two quality modes were present.
- The user reported about one second of trailing delay at the old 4K setting, with 1440p somewhat better, then confirmed 0.4.1 Responsive mode was clearly improved and usable. Detail-mode latency on that mobile network was not separately confirmed.
- The browser was categorized as WeChat or another embedded browser; the exact phone and network were not recorded. Layout checks at 390×844 and 820×1180 were browser emulation, not real iPad acceptance.

## Latency evidence boundaries

Under the same throttled input replay, the old implementation queued 65596 bytes and dropped button release; the new implementation retained the latest position and delivered release with 134 queued bytes. At a simulated 32KB/s this corresponds to approximately 2002ms versus 4ms of queue-tail time. This is transport-queue simulation, not mobile end-to-end latency.

Local browser samples for Detail/Responsive mode were approximately 29/30 FPS, 69/22ms receive-buffer delay and 4/1ms network RTT. They do not establish a same-network mobile comparison or full input-to-picture latency. Capture uses a two-frame queue and avoids submitting capture frames older than 150ms; that is not an end-to-end latency guarantee.

## Remaining gaps and known limits

Real iPad, different browsers/networks, TURN, full system wake, lock-screen password entry/unlock and system secure input need separate acceptance. Ordinary password-field success does not establish Touch ID or FileVault support. A sleeping-display failure was reproduced on a locked Mac and capture startup recovered after display wake; this does not prove usable lock-screen video or password entry. The helper is ad hoc signed and not notarized; each Mac requires its own permission grants.

A Desktop hot update left the sidebar entry missing while the Host and existing mobile URL continued to work. The app was not restarted for this issue, and restoration after a normal restart remains unconfirmed. Intel Mac, Windows, Linux, audio and file transfer are unsupported.
