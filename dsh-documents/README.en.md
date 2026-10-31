# DSH Documents

[中文](README.md) | English

Browse a local document library in DeepSeek Harness, append notes to a fixed Inbox, edit original files, and manually quote a selection or full document into the current conversation draft. Version 0.3.0 targets DSH 0.2.1-rc.5.

An unofficial community plugin. The library can be an Obsidian vault or any ordinary folder; no Obsidian plugin is required.

## Install and configure

Download the [standalone package](https://github.com/pipilu123566/deepseek-harness-plugin/releases/download/%40pipilu123566%2Fdsh-documents%400.3.0/pipilu123566-dsh-documents-0.3.0.tgz) and `SHA256SUMS` from the [0.3.0 Release](https://github.com/pipilu123566/deepseek-harness-plugin/releases/tag/%40pipilu123566%2Fdsh-documents%400.3.0). Install the `.tgz` through DSH’s Plugins page. For a standalone Web profile:

```sh
dsh plugin --profile <profile> add /absolute/path/pipilu123566-dsh-documents-0.3.0.tgz --ignore-scripts
```

Use the desktop plugin manager for the Desktop profile instead of modifying a running desktop profile through an external CLI. Restart is needed if the host does not enable hot reload. Installation does not automatically read any document library.

The repository root is a collection rather than an installable plugin. This plugin’s source is in `dsh-documents/`; no unverified Git-subdirectory or npm install command is provided.

Open Documents in global navigation or the conversation’s right sidebar guide. Configure an absolute host directory and the relative path to an existing Markdown Inbox within it, for example `/path/to/Vault` and `KnowledgeOS/inbox.md`. Settings and recent paths live in DSH_HOME/document-library/state.json, outside the plugin package.

## Usage

- Browse folders, search names and relative paths, and reopen the latest 15 files.
- Inbox opens the same file at its end. Edits automatically save to the original file after about 700 ms of inactivity. Saving pauses during IME composition and resumes after commit. There is no Save button; Cmd/Ctrl+S can still trigger an immediate save. No automatic timestamps or templates.
- Markdown uses live preview only: syntax markers appear on the caret/selected lines while other text keeps its rendered styling. Selecting a table reveals its source. Mode tabs are removed. UTF-8 text such as SQL, JSON and Python remains editable with syntax highlighting and automatic saving.
- Create Markdown in the current directory without overwriting existing files. Hidden files and symlinks are omitted from the tree.
- Preview PNG/JPEG/GIF/WebP and PDF. Open spreadsheets, presentations and other formats using the host machine’s associated application.
- In a conversation, quote selected text or the whole document into the composer. Relative source paths are included; text awaiting autosave is labeled as a draft. Quoting does not send. Images and PDFs are not converted to text.
- Switching files first completes the current save; failures retain the editor and prevent navigation. Leaving the global panel or closing a conversation document tab lets saving finish in the background. Failed drafts remain in this window’s memory and can be reopened. Draft recovery after page reload or plugin unload is outside this version’s scope.
- External changes are checked every four seconds. Clean files refresh automatically. Dirty files retain the draft and refuse overwrites. Copy anything needed before discarding the draft and reloading; no diff merge or version history is provided.

## Boundaries

One library root and one file per view; the conversation working directory is unchanged. Live preview uses CodeMirror 6 decorations; saving and quoting always use the original Markdown. Headings, emphasis, inline code, lists, quotes, links, fenced code and basic tables are supported. It does not promise Obsidian Wikilinks, plugin blocks, Canvas or Bases support. Preview removes scripts, embedded objects and image sources; external links are not opened automatically. Limits: 5 MiB UTF-8 text, 25 MiB image/PDF. Larger or non-UTF-8 files can open externally. Search scans up to 20000 entries and returns up to 200 matches, with a truncation notice.

Local save success does not mean cloud synchronization completed. Typing during a save is preserved rather than overwritten by an older save result. Version checks and temporary-file replacement protect ordinary external edits; conflicts stop autosaving and retain the draft. There is no distributed file locking or cloud transaction support. Separate windows check file revisions at save time.

External opening uses open/xdg-open on macOS/Linux. Windows external opening is currently unsupported and reports an error. Web external opening acts on the host. Desktop and isolated Web were validated on macOS arm64; other platforms and host versions were not verified. Unloading releases subscriptions, polling and close handlers; documents are not deleted.

## Development and validation

Node 24.16.0 and pnpm 10.33.2; pnpm-lock.yaml pins dependencies. Run `pnpm install --frozen-lockfile --ignore-scripts`, `pnpm test`, `pnpm build`, and `pnpm pack`. Client code bundles from source and uses host React and public slots. The Host exposes root-scoped operations through authenticated Typert RPC.

See the [0.3.0 validation record](docs/validation.en.md) for tested behavior and limitations. Report issues through [Issues](https://github.com/pipilu123566/deepseek-harness-plugin/issues), including the plugin name, version and DSH version.

Original plugin code is [MIT licensed](LICENSE). Bundled dependency terms are retained in [Third-party notices](THIRD_PARTY_NOTICES.md).
