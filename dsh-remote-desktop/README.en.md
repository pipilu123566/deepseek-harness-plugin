# DSH Remote Desktop

[中文](README.md) | English

View and control a Mac from a computer, phone or iPad browser, with direct keyboard input, mouse-wheel controls, pinch zoom and panning. An independent community plugin; it does not call models or pause or resume AI tasks.

**Public preview 0.4.2**, compatible with DeepSeek Harness **0.2.1-rc.5**. The computer side supports **Apple Silicon Macs running macOS 13 or later** only. The remote page and Mac permission window currently use Chinese primarily.

## See the workflow

![0.4.2 computer and touch workflow illustration](https://raw.githubusercontent.com/pipilu123566/deepseek-harness-plugin/main/dsh-remote-desktop/media/remote-0.4.2-workflow.en.png)

A 0.4.2 workflow illustration, not a screen recording: choose display/quality in the top bar, click the remote target, then use computer keyboard/mouse controls or touch gestures. No real desktop, login URL or password appears. The older [0.4.1 mobile-size UI](media/remote-0.4.1-controls.png) remains for historical comparison and does not represent the new layout.

### Historical workflow preview (0.3.6)

Prepare permissions on the Mac → open your personal login link on the phone → zoom and pan to the target → select a field and send text, then disconnect when finished.

![DSH Remote Desktop 0.3.6 feature prototype: prepare the Mac, connect a phone, zoom to a target, send text and disconnect](https://raw.githubusercontent.com/pipilu123566/deepseek-harness-plugin/main/dsh-remote-desktop/media/remote-0.3.6-workflow.en.gif)

An approximately 14-second feature prototype based on public preview 0.3.6, using a synthetic desktop and demo data. English captions explain the workflow; controls retain this version’s Chinese UI. This is not a phone recording or proof of lock-screen unlock or real iPad acceptance. No real login link or QR code is generated. Static steps: [Preparation](media/remote-0.3.6-setup.en.png) · [Zoom and pan](media/remote-0.3.6-zoom.en.png) · [Text input](media/remote-0.3.6-input.en.png).

The [0.3.3 browser mobile-emulation screenshot](docs/mobile-zoom-demo.png) remains available. It uses a synthetic test pattern and does not operate the Mac; it illustrates the older zoom workflow only. The phone still needs a reachable DSH HTTPS endpoint. The plugin does not provision public internet access.

## Installation

Download `pipilu-dsh-remote-desktop-0.4.2.tgz` and `SHA256SUMS` from the [0.4.2 Release](https://github.com/pipilu123566/deepseek-harness-plugin/releases/tag/%40pipilu%2Fdsh-remote-desktop%400.4.2). In the download directory run `shasum -a 256 -c SHA256SUMS`.

Select the downloaded `.tgz` in DeepSeek Harness plugin management and enable it. For a Web CLI profile, install the local package with:

```sh
dsh plugin --profile <your-web-profile> add /absolute/path/pipilu-dsh-remote-desktop-0.4.2.tgz --ignore-scripts
```

Open Remote desktop (「远程桌面」) in the sidebar. The repository root is not an installable plugin. The package name remains `@pipilu/dsh-remote-desktop`; this version is not published to npm.

## Display and quality modes

Only two quality modes are exposed, alongside the separate display selector. Responsive mode captures up to 1440p and prioritizes frame rate; WebRTC may reduce transmitted resolution under CPU or network pressure. Detail mode captures native pixels up to 3840×2160 and prioritizes resolution, allowing frame rate to fall when necessary. Both preserve aspect ratio without upscaling or changing the Mac display mode. Changing the mode or display reconnects the session.

High-frequency pointer motion and scrolling are coalesced per browser frame. Button/key releases, shortcuts and text retain reliable delivery; severe congestion disconnects safely instead of silently losing releases. Capture queues two frames and avoids catching up on obsolete images. Expand Connection status to inspect received dimensions, network RTT, input acknowledgement RTT, received frame rate and video buffer delay. These are not complete input-to-picture latency measurements; static desktops may naturally have a low frame rate.

A user confirmed Responsive mode improved usability. Detail-mode latency on that mobile network and behavior across other devices/networks still require separate checks.

## Upgrade from an older version

Update the existing package with the 0.4.2 `.tgz`, enable it and reload the remote desktop page. This release retains the two quality modes and fixes the orphaned locale dictionary that could remove the Desktop sidebar entry after a hot update. The separate shortcut-input pane/button is removed; click a remote target and type directly. The phone-access dialog opens from the phone icon at the top right.

The native helper remains the unchanged 0.4.1 artifact; capture policies were not rebuilt or changed. Retain your configuration and do not uninstall unrelated plugins for upgrade testing.

## Connection and controls

1. Run DeepSeek Harness on the Mac. On first use select 「在 Mac 设置权限」, grant Screen Recording and Accessibility access, then refresh the status. macOS may attribute these permissions to DeepSeek Harness.
2. Select 「连接这台 Mac」. Click the intended target in the desktop image before dragging, scrolling or typing directly. Direct input is retained; this release removes the old shortcut-input pane and its button. Login passwords are not entered automatically or stored.
3. For a new mobile browser, click the phone icon at the top right of the authenticated page to open 「在手机或 iPad 上打开」. Generate the local QR code or copy your full login URL and open it on the phone. The page clears the code after 60 seconds or when backgrounded; this does not revoke the DSH owner authorization. The link grants DSH owner access and must not be shared.
4. Pinch continuously between 1× and 8× the fit size. Pan with two fingers when zoomed, or enable 「移动画面」 for one-finger panning. At fit size, two fingers scroll the computer content. The −, + and 「适应屏幕」 controls zoom or reset the view. Rotation retains the zoom factor.
5. Select 「断开连接」, or disconnect from the Mac's 「远控」 menu bar item. This ends the remote session without shutting down the Mac or other applications.

A plain URL does not provide authorization. WeChat's embedded browser, Safari and Chrome may use separate login sessions; open the complete login URL in the same browser you intend to use. Anonymous navigation shows an authorization guide while APIs remain protected. Old login URLs may expire after the Host restarts; generate a new one on the Mac.

## Compact layout and computer controls

Display, quality and connection details now live in the top menu bar, wrapping within that bar on narrow screens. The machine/status summary stays compact and the viewer fills the remaining height. The phone icon still opens the personal-link and QR dialog at the top right. Closing it clears this page’s URL and QR code without revoking issued authorization. The old shortcut-input pane and its button are removed; click the remote target and type directly. No new IME or password-input path was introduced.

| Computer input | Action |
| --- | --- |
| Wheel | Scroll remote content |
| Shift + wheel | Scroll horizontally; do not convert a browser-normalized horizontal delta twice |
| Ctrl / Command + wheel | Zoom the view around the pointer |
| Drag or wheel with Move view enabled | Pan the view |
| Windows / Linux Ctrl chords | Map to Mac Command in Auto mode; Mac clients retain native keys |

Footer help offers Auto, PC Ctrl → Mac Command and Raw modes. Use Raw for terminal Control-C and other native Control chords. Copy/paste operates on the Mac clipboard, not a synchronized cross-device clipboard. Browser/system-reserved shortcuts may not be forwarded. Touch devices retain tap, pinch, pan and two-finger scroll.

All 27 automated checks pass, covering keyboard/wheel mapping, dialogs, client lifecycle and existing remote-control logic. A user confirmed that the layout and computer keyboard/mouse worked normally. Device, OS and browser details were not recorded; this does not establish coverage of every client. See the Release and [validation record](docs/validation.en.md) for commit, checksum and isolated-install verification.

## Mobile and internet access

The plugin does not provision a public service. The phone must reach the DSH HTTPS endpoint running this plugin; a Mac loopback address is not directly reachable from a phone. Use your own domain and HTTPS reverse proxy or tunnel, retaining DSH owner authentication and the original Host and Origin. Do not expose an unauthenticated local port. See [HTTPS and relay configuration](docs/deployment.en.md).

The default STUN configuration attempts a direct WebRTC connection. An HTTPS tunnel carries the page and signaling; it is not a TURN media relay. Networks that cannot connect directly may need your own `iceServers`. No TURN account or relay service is provided.

## Support and limitations

| Area | Scope |
| --- | --- |
| Controlled computer | Apple Silicon Mac, macOS 13+; Intel Mac, Windows and Linux controlled hosts are unsupported |
| Video | Selectable connected display, up to 3840×2160 without upscaling, capture target 30 fps; no audio or file transfer |
| Input | Mouse, shortcuts, Unicode text and ordinary password fields; no guarantee for every system secure-input scenario |
| Mobile | A user confirmed phone connection, input, disconnect, pinch zoom, dual-display operation and improved Responsive mode; real iPad coverage, all browsers and different networks are not exhaustively verified |
| Sleep and lock | Wake the display before capture and keep the display/system awake during a session; full system wake and lock-screen password entry/unlock remain unverified |
| Native helper | Bundled helper 0.4.1; archive SHA-256 and application signature are checked during preparation; ad hoc signed, not Apple notarized |

The Mac must remain powered on, online and running DeepSeek Harness. Display wake does not disable the screen lock, unlock FileVault before login, or replace Touch ID. Version 0.3.5 verified that waking a sleeping display on a locked Mac restores capture startup. A full phone retest of that fix is still pending; this is not proof of usable lock-screen video or password entry.

## Architecture and data

ScreenCaptureKit captures the desktop, WebRTC carries video to the browser, and a WebRTC DataChannel carries input to CGEvent/Accessibility on the Mac. The DSH Host manages owner authentication and an exclusive connection lease. The native helper is managed through child-process stdin/stdout, with no extra TCP control listener. macOS Screen Sharing is not required.

Connection state stays in memory. Unattached reservations expire after 15 seconds. Signaling permits SDP and ICE only. Text, passwords and desktop images are not written into chat or plugin diagnostic logs. Disconnect, channel closure and plugin disposal release input state and terminate the corresponding helper and wake assertion. The plugin does not persist input or record desktops; DSH manages its own authentication cookies.

## Development

Use Node **22.21.1**, pnpm **10.33.2** and this directory's lockfile:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm test
pnpm build
pnpm pack --pack-destination /absolute/path/output
```

The signed helper archive is committed, so web-only work does not require a native rebuild. To rebuild it, use macOS and Swift **6.3.3** in Swift tools 5.10 mode. Download WebRTC **156.0.0** from `native/vendor-lock.json`, verify its SHA-256 and extract the XCFramework to `native/Vendor/WebRTC.xcframework`, then run `pnpm build:agent`. This updates the helper archive, ad hoc signature and manifest hash.

The 27 tests cover authentication, permissions, leases, signaling isolation, disconnect cleanup, display-wake cancellation, zoom geometry, mode selection and input coalescing. See [validation coverage](docs/validation.en.md) for release checks and remaining gaps.

## License and feedback

Project-owned code follows the parent repository's [MIT license](LICENSE). WebRTC retains the [Google WebRTC license](third-party/WebRTC-LICENSE), also included in the helper archive. JavaScript dependencies retain their respective licenses. Report issues in [Issues](https://github.com/pipilu123566/deepseek-harness-plugin/issues) with plugin, Host, macOS and browser versions; omit login URLs, passwords and cookies.
