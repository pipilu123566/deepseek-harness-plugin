# 0.8.0 candidate validation

[中文](validation-0.8.0.md)

Date: 2026-11-04. DSH 0.2.1-rc.5 on macOS arm64, Node 24.16.0 and pnpm 10.33.2. No dependency or lockfile changes.

## Covered

- All 90 checks pass. The existing resolver's missing encoded heading fragment failed before the fix and passed afterward. Tests cover heading hierarchy/format/duplicate order, navigation branches and bounds, original YAML, and table row/column/pipe/backslash behavior.
- An isolated Web profile with its own DSH_HOME loaded the plugin. Chinese and parent/child heading links locate the target; Back/Forward restores document positions. One document editor remains mounted.
- Properties start collapsed and expand to read-only multiline values. No YAML reserialization or external requests; nested source fields and comments remain intact.
- Table cell input, Tab/Shift+Tab, row/column changes, undo and autosave work. One lightweight textarea per table shares the document editor and version-checked writer.
- A temporary native WebKit capture window was tested with the system Chinese Pinyin IME: select-all, uncommitted input, Space commit and composition correction. Uncommitted Pinyin was not persisted. Cross-cell navigation, appending a row with Tab, Shift+Tab and Escape work. Native system Undo restores a column change.
- Exact Chinese cell text was read back from fixture Inbox, each submission appeared once, and drafts cleared. Metadata and ordinary body text remained intact. No global hotkey was registered; the temporary window was disposed afterward.

## Issues corrected

The initial nested contenteditable cells could return native focus to the document. A lightweight textarea replaced them; blur cleanup is isolated while moving between cells, and native beforeinput undo/redo uses the shared editor. Failed input is excluded from acceptance; the corrected implementation was tested again.

Performance samples measure EditorState.update, including preview state, and exclude DOM, native queues and painting. They are not end-to-end key latency. Source, build, package, isolated install and visible behavior are checked separately; formal Desktop installation is recorded in the local delivery evidence.

## Limits

No block-reference navigation, full YAML type editor, spreadsheet grid paste, sorting, formulas, merged cells or saved-version history. Oversized/unsupported tables remain editable as source. Per-panel history stores at most 50 paths/positions and no document bodies.

This candidate has not been published on GitHub. Only temporary fixtures were used; formal notes, Inbox and capture drafts were not edited. Formal Desktop installation and acceptance remain separate.
