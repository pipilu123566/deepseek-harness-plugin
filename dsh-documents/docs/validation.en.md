# 0.3.0 validation record

[中文](validation.md) | English

Validation date: 2026-10-31. Target host: DeepSeek Harness 0.2.1-rc.5 on macOS arm64 Desktop and isolated Web profiles. The project uses Node 24.16.0, pnpm 10.33.2 and the committed lockfile; Desktop installation uses the host’s bundled pnpm 11.28.5.

## Verified scope

| Area | Result |
| --- | --- |
| Automated tests | 23 passed: file/version protection, path boundaries, BOM/CRLF, live-preview decorations, Chinese edits and undo, autosave debounce, composition hold, typing during saves, serialized versions, conflict retention, retry and view-leave flushing |
| Live preview | Active lines retain syntax while other lines use reading styles. Headings, inline formatting, tables and fences do not rewrite original Markdown |
| Autosave | Desktop edits save without clicking Save. Returning to files, leaving the global panel and closing a conversation document tab were verified by reading temporary files from disk |
| Chinese input | Native key presses with installed Sogou Pinyin. Composition held for over five seconds did not write pinyin to disk. Committing and continuously typing 你好世界 autosaved correctly, without observed dropped characters, caret jumps or interrupted composition |
| Conflicts | The external file and local Chinese draft were both retained. Autosave stopped with a conflict notice; explicitly discarding the draft reloaded the external version |
| Actual UI | Global and existing conversation views have no Save button or mode tabs. Quote-document, quote-selection and system-open controls remain. Layout was inspected in a 1280×820 Desktop window |
| Installation/runtime | The actual 0.3.0 tarball installed in an isolated profile and loaded through the real Loader/RPC. Relevant Desktop-installed feature files matched source hashes and the app started normally |
| Public packaging | The first GitHub release adds repository metadata, bilingual installation docs, validation records and third-party notices. Feature files match the previously validated Desktop build |

Writes used temporary Markdown/SQL files. Private documents were neither modified nor sent. Library, Inbox and recent-file settings were restored exactly. Browsing does not send documents to a model; quoting only populates the composer.

## Boundaries

These results apply to the stated environment and cases. Other input methods, candidate-window positioning, 390px Web layout, minimum Desktop width, light theme, real PDF/Office rendering, other operating systems and cross-device cloud sync were not verified. Browser control was disabled; earlier Web screenshots were not treated as evidence for this version’s narrow layout.

Local saving does not prove cloud synchronization completed. Version checks protect ordinary external edits, without distributed locks, diff merging or version history. Unsaved drafts are not recovered after page reload or plugin unload.

## Reproduce

Inside `dsh-documents/`, use the declared toolchain for `pnpm install --frozen-lockfile --ignore-scripts`, `pnpm test`, `pnpm build` and `pnpm pack`. Install artifacts with independent `DSH_HOME`, `DSH_AGENTS_HOME` and a complete Web profile, without copying account settings or private documents. The plugin-version Release supplies the installable artifact and `SHA256SUMS`.
