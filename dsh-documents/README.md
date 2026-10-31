# DSH 文档库

中文 | [English](README.en.md)

在 DeepSeek Harness 中浏览本地文档目录、打开固定 Inbox 追加记录，编辑原文件，并把选段或全文手动放入当前会话输入框。版本 0.3.0，适配 DSH 0.2.1-rc.5。

非官方社区插件。文档目录可以是 Obsidian 库，也可以是任意普通文件夹；无需安装 Obsidian 插件。

## 使用演示

找材料 → 随手追加 Inbox 并自动保存 → 把选段引用到会话输入框，确认后再发送。

![DSH 文档库 0.3.0 功能原型：浏览本地文档、追加 Inbox 自动保存、引用选段到会话输入框](https://raw.githubusercontent.com/pipilu123566/deepseek-harness-plugin/main/dsh-documents/media/documents-0.3.0-workflow.zh.gif)

约 14 秒循环演示，按已发布的 0.3.0 功能绘制，使用演示数据，属于功能原型而非桌面操作实录。静态分步图：[浏览文档](media/documents-0.3.0-browse.zh.png) · [Inbox 自动保存](media/documents-0.3.0-inbox.zh.png) · [引用到会话](media/documents-0.3.0-quote.zh.png)。

## 安装与配置

从 [0.3.0 Release](https://github.com/pipilu123566/deepseek-harness-plugin/releases/tag/%40pipilu123566%2Fdsh-documents%400.3.0) 下载 [独立安装包](https://github.com/pipilu123566/deepseek-harness-plugin/releases/download/%40pipilu123566%2Fdsh-documents%400.3.0/pipilu123566-dsh-documents-0.3.0.tgz) 和 `SHA256SUMS`。在 DSH「插件」页安装 `.tgz`；独立 Web profile 也可运行：

```sh
dsh plugin --profile <profile> add /absolute/path/pipilu123566-dsh-documents-0.3.0.tgz --ignore-scripts
```

Desktop profile 使用桌面端插件管理入口；应用运行时不从外部 CLI 改写它。宿主未开启热加载时，需要重启后生效。安装不会自动读取任何文档库。

本仓库根目录是插件集合，不能直接安装；本插件的源码在 `dsh-documents/`，不提供未经验证的 Git 子目录或 npm 安装指令。

点击全局「文档库」，或在会话右侧边栏的开始页选择「文档库」。首次配置本机绝对根目录，以及该目录内已有 Markdown Inbox 的相对路径。例如根目录 `/path/to/Vault`、Inbox `KnowledgeOS/inbox.md`。这两个值保存在 DSH_HOME/document-library/state.json，不写进插件包。

## 使用

- 文件树逐层浏览；搜索匹配文件名和相对路径；最近打开保留最近 15 个文件。
- Inbox 打开同一文件并定位末尾。停止输入约 700 毫秒后自动保存回原文件；中文组合输入期间暂停，提交后再保存。不显示保存按钮，Cmd/Ctrl+S 仍可立即触发保存。不自动添加时间戳或模板。
- Markdown 仅使用实时预览：光标或选区所在行显示语法标记，其他位置保留标题、列表和行内格式；表格在选中时展开原文。不再显示模式切换标签。SQL、JSON、Python 等 UTF-8 文本可编辑、语法着色并自动保存。
- 新建 Markdown 在当前目录创建，不覆盖同名文件。隐藏文件和符号链接不列入目录树。
- PNG/JPEG/GIF/WebP 和 PDF 内嵌预览；Excel/PPT 等由宿主机器的系统应用打开。
- 会话文档面板支持引用选段或全文。引用附相对路径，尚未自动保存的内容标注草稿，只加入输入框，不自动发送。不把图片/PDF 自动转换为文字。
- 切换文件前完成当前文件保存；保存失败会保留当前编辑并阻止切换。离开全局面板或关闭会话文档页时继续完成保存，失败草稿留在本窗口内存，重新打开可继续。页面重载或插件卸载后的草稿恢复不在本版范围。
- 外部修改每 4 秒检查一次；无草稿时自动刷新，有草稿时阻止覆盖并保留编辑。可复制所需内容后放弃草稿、重新读取。不提供差异合并或版本历史。

## 支持边界

单根目录、单文件视图，不改变会话工作目录。实时预览基于 CodeMirror 6 的语法装饰，保存和引用始终使用 Markdown 原文。支持标题、强调、行内代码、列表、引用、链接、围栏代码和基础表格，不承诺 Obsidian 双链、插件块、Canvas、Bases 等语义；预览移除脚本、嵌入对象和图片源，外部链接不自动打开。文本最大 5 MiB，图片/PDF 最大 25 MiB；超出或非 UTF-8 可交给系统应用。搜索最多扫描 20000 项、返回 200 项并明确提示截断。

本机保存成功与云同步完成分开。保存中继续输入不会被较早的保存结果覆盖。原文件版本比较和临时文件替换保护通常的外部修改；发生冲突时停止自动保存、保留草稿，不提供跨设备文件锁或云同步事务。多个窗口同时编辑同一文件时，以保存时的版本检查为准。

系统打开在 macOS/Linux 使用 open/xdg-open；Windows 暂不支持外部打开，会明确报错。Web 的系统打开作用于宿主机器。已验证 macOS arm64 的 Desktop 和隔离 Web；其他平台及宿主版本未验证。客户端卸载释放订阅、轮询和关闭处理器；不删除文档。

## 开发与验收

Node 24.16.0、pnpm 10.33.2，依赖锁定在 pnpm-lock.yaml。运行 `pnpm install --frozen-lockfile --ignore-scripts`、`pnpm test`、`pnpm build`、`pnpm pack`。客户端从源码打包，使用宿主 React 和公开 slot。Host 通过已认证的 Typert RPC 提供限定根目录的文件操作。

验收环境、已覆盖交互和未验证范围见 [0.3.0 验收记录](docs/validation.md)。问题反馈请在 [Issues](https://github.com/pipilu123566/deepseek-harness-plugin/issues) 中注明本插件名称、版本和 DSH 版本。

自有代码采用 [MIT](LICENSE)，打包依赖的许可保留在 [第三方许可证](THIRD_PARTY_NOTICES.md)。
