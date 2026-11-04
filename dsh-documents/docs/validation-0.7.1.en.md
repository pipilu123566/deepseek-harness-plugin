# 0.7.1 settings and navigation validation

[中文](validation-0.7.1.md)

Date: 2026-11-04. Host: DSH 0.2.1-rc.5 on macOS arm64. Node 24.16.0 and pnpm 10.33.2; existing lockfile retained, no new dependency or toolchain downgrade.

## Verified

- All 82 existing checks passed; the build succeeded.
- The packed artifact loaded in an isolated Web profile with a separate DSH_HOME, sample documents and Inbox, no real credentials, and global capture disabled.
- The left navigation contains the sidebar toggle, Files and Outline. A bottom gear opens the settings page. Inbox, quick capture and settings actions are removed from the document header.
- Settings groups cover Library, Inbox, Attachments, Quick capture and About. Opening Inbox/capture and saving settings work. Pending configuration changes disable the open actions until saved or cancelled.
- Opening settings focuses its first input. Returning preserves the document caret, scroll and undo history, with one document editor.
- Capture opened from settings submits to the fixture Inbox; the exact text was read back and its draft cleared. Closing capture returns to the document.
- A collapsed sidebar retains a 40px icon rail with usable settings, outline and file controls.
- The duplicate outline action is removed from the document toolbar. Outline navigation and restored editor focus work.
- Light and dark settings screenshots were inspected. At 390×844, navigation and settings remain accessible with no horizontal overflow; outline navigation restores editor focus.

## Limits and formal installation

This iteration changes navigation, settings and view retention, without modifying the editor core or native event handling. End-to-end key latency and system IME candidates were not remeasured; prior 0.7.0 results are not new tests of this iteration.

The formal Desktop remains on 0.7.0. An active conversation with two subagents was observed, so it was not restarted for installation. Isolated Web evidence does not replace formal Desktop installation and acceptance. No GitHub release was published.
