# 0.4.0 local candidate validation

Date: 2026-11-02. Target: DSH 0.2.1-rc.5 on macOS arm64; build tools: Node 24.16.0 and pnpm 10.33.2.

## Scope

Documents, the fixed Inbox, browser capture and Mac global capture share the same CodeMirror editor and capture implementation. Native capture adds a WebKit window inside the host, with no separate persistent application or HTTP service.

## Evidence

- 37 behavioral checks cover Tab/outdent/undo, composition-aware saving, candidate keys and Escape focus release, literal Markdown and Wikilinks, ambiguous names, scoped paths, copied attachments, draft reload, deduplicated append, revision conflicts, interrupted commit recovery, BOM/CRLF and one-time non-destructive legacy draft import.
- A real tarball was installed into an isolated Web profile and loaded by the actual host. Authenticated RPC wrote and reread SQL while rejecting stale saves and out-of-root paths. Test configuration, logs and notes are separate from the daily profile.
- Chrome checks cover the file tree, live preview, literal Tab, multiline/list indentation, Shift+Tab, Escape then Tab, full-document/selection references added to the composer without sending, 1280×820 and 390×844 layouts, file attachments, image previews and draft recovery after reload.
- The isolated native window runs the actual shared editor: Tab/outdent and Escape-to-toolbar; system Pinyin composition and candidate selection, with no intermediate Pinyin saved and committed Chinese reread from disk; native attachment selection, relative Markdown and image display; disposal while a picker is open cancels it and releases the window and callbacks.
- The candidate was installed into the formal Desktop profile while retaining its library root and Inbox. The old capture plugin is disabled without deleting its data. A real human Option+Space press was verified in the isolated native environment: the user confirmed the window appeared, and the host recorded one shortcut callback. Final Desktop installation readback is tracked separately.

## Limits

- Not every input method, third-party IME, real phone/iPad, cross-network editing path or operating system was covered. Browser viewport checks do not establish real-device acceptance.
- The formal public endpoint timed out during this run; cross-network access is not claimed. The local isolated Web editing path was validated.
- Failed ordinary document drafts remain in the current window; capture drafts persist separately. Simultaneous capture edits reject stale revisions rather than merging them.
- This local candidate has not been published to GitHub. Existing 0.3.0 downloads and demos retain their version.
