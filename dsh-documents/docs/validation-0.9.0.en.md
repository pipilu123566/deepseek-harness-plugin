# 0.9.0 validation

[中文](validation-0.9.0.md)

Date: 2026-11-04. DSH 0.2.1-rc.5, macOS arm64. Project toolchain: Node 24.16.0 / pnpm 10.33.2. No new dependencies; the plugin lockfile is byte-identical to the start of this change. The candidate was installed in formal Desktop after its normal task-aware quit, then restarted successfully. The GitHub release uses the same runtime files; README and validation notes were updated for publication.

## Coverage

- 115 behavior checks pass, with no failures or skips: session paths/address encoding, complete reads, encoding/size bounds, BOM/CRLF, conditional atomic saves, read-only/cold-session permissions, containment/symlinks, recovery and preference lifecycle.
- The actual package runs through the real Loader in an isolated DSH_HOME. Markdown opened from the official file tree uses Documents; plain text retains the official viewer. Disabling restores official Markdown preview. The preference saves without a configured library or Inbox.
- Native Chrome with the system Pinyin IME covers composition, candidate correction using Backspace, Space commit, Tab appending/moving to a row, Shift+Tab returning and Escape to the document. Uncommitted Pinyin does not enter the file or host recovery copies; “你好” was read back exactly once. Attempts with an inactive Chinese input source were excluded.
- Switching the actual session to read-only produces a noneditable DOM, and table clicks do not activate an input. Host writes also refuse read-only mode. After a runtime restart, exact cold-session permission projections allow editing without a prompt or model invocation.
- Real RPC rejects stale versions while preserving external text. Frontmatter prefixes remain intact after saving and recovery.
- Outline navigation and document Find work. Other formats retain official registrations/openers; the file tree, preview owner and workspace module remain enabled.
- With the temporary service stopped, input leaves the original file unchanged and autosave pauses. Following host restart and client page reload, browser recovery restores “断线恢复终验” that had not reached host recovery. Explicit restoration then saves it exactly once.

## Disconnect fix

The first implementation mirrored drafts only to the host, so both save and recovery requests failed while offline; client teardown could discard the memory buffer. A regression first failed across failed write → editor teardown → new recovery reader. Asynchronous IndexedDB recovery was then added, and the original runtime scenario was repeated successfully. Backups still use the shared AutoSave composition gate, run after idle, and deduplicate identical snapshots; no synchronous storage write runs on every key. A per-writer revision orders copies across browser and host, avoiding cross-machine wall-clock assumptions.

Browser and host copies are bounded separately and never evict pending recovery automatically. Unavailable destinations are reported. Saving still uses the host version guard; restoring against a changed original pauses autosave, with copy or discard/reload available.

## Evidence boundaries

The live test used a local DSH service and Chrome, with disconnects reproduced by stopping the temporary service. Filesystem-contract fixtures cover paths, permissions and versions in another execution world. No external SSH host was connected. The current host may require a page refresh after a restart; recovery across that reload was covered, and host reconnect behavior was not modified.

Build/install results, regression scripts and EditorState timings are not physical end-to-end key latency. Formal Desktop 0.9.0 was verified through the official file tree: shared editor activation, table editing, Tab navigation, autosave readback exactly once and preserved frontmatter. Disabling the preference restored official Markdown preview. Plain-text fallback was sampled with the preference off on Desktop and on in Web. Other remote devices and IMEs remain unverified. Existing library root, Inbox and capture settings were preserved; production notes, Inbox and global-capture drafts were untouched. The default-Markdown preference was restored off after testing.

The user explicitly deferred the joint test of the new IndexedDB destination and native IME candidates; it no longer blocks this delivery. Shared AutoSave regressions cover excluding composition and retaining committed text. The deferred joint test was not performed and is not counted as a pass.
