# 0.7.0 candidate validation

Targets DSH 0.2.1-rc.5 on macOS arm64. Node 24.16.0 and pnpm 10.33.2; official @codemirror/search 6.7.2 is pinned in pnpm-lock.yaml. The toolchain was not downgraded.

Coverage includes incremental live preview, lightweight external-change checks, ordinary-document recovery, reading positions, formatting/Find shortcuts and the current-document outline. Automated checks cover differential full-render comparisons, consecutive edits, duplicate headings, code/frontmatter exclusions, recovery bounds, separate editor drafts and composition-aware saving.

An actual isolated DSH interface exercised outline navigation, nested-section unfolding, duplicate headings, long documents and a worker outline above 200,000 characters, recovery saves and position restoration. A 390 CSS px layout checks outline/document transitions, Find and horizontal overflow. The native WebKit fixture used the system Pinyin IME for candidate retention, correction, commit, Tab, newline, bold toggling and candidate cancellation inside Find, followed by exact draft and test-Inbox readback.

The performance comparison uses a fixed mixed-Markdown fixture and measures EditorState.update including live-preview state computation. It excludes native event queues, DOM layout and screen presentation; this is not end-to-end input latency.

All interactions use disposable notes, drafts and Inbox files. The native fixture disables shortcut registration to avoid contention with the real host. Source, artifact, isolated Loader, formal Desktop and user-perceived acceptance are distinct. This page does not certify every device or network. Current formal-installation status, artifact hashes and raw measurements remain in the local task record outside the public package.
