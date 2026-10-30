# 贡献与发布约定

在仓库根目录下为每个插件建立独立目录，例如 `dsh-balance/`。不在此仓库放入企业私有适配、个人配置、凭据、已安装宿主状态或嵌套 Git 仓库。

每个插件目录包含自己的包清单、锁文件、源码、测试、README、许可证和必要文档。使用该目录声明的工具链；不因父仓库聚合而强制所有插件共用依赖版本。`repository.url` 指向父仓库，`repository.directory` 指向插件子目录，反馈入口指向本仓库 Issues。

文档采用中文优先：父仓库及每个插件的 `README.md` 默认展示中文，`README.en.md` 提供完整英文说明，顶部相互链接。中英文的版本、安装步骤、支持范围和限制保持一致；已有中文专用文件可保留为兼容入口，避免旧链接失效。

余额插件的开发命令在 `dsh-balance/` 中执行：

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm test
```

发布前从最终提交的干净导出进入目标插件目录打包，只发布该插件的 `.tgz` 与校验值。核对文件范围、提交内容、宿主兼容范围，并在隔离宿主实际安装、交互、卸载和重装；发布后从公开来源下载核对并再次安装。模拟数据、真实账户及平台覆盖分别记录。

每个插件独立递增版本，父仓库后续 tag 使用 `<完整包名>@<版本>`，例如 `@pipilu123566/dsh-balance@1.0.1`。Release 标题写插件名与版本，说明对应目录、提交和安装包。不要将某插件的最新 Release 当作整个仓库所有插件的最新版本。

DSH Balance 1.0.0 已在原仓库发行：保留原 tag、Release 和下载链接，后续代码仅在本仓库维护。本次迁入后的源码仍以 1.0.0 为开发基线；下一次实际打包发布前递增版本，不用同版本安装包覆盖历史附件。

每个 README 提供经过验证的安装入口。仓库根目录不声明 `dsh.bundle`，不能直接作为插件安装；新的 Git 子目录安装方式必须实测后再提供给用户。

English: keep each plugin self-contained, build and test inside its directory, and release it independently. Preserve existing release artifacts and tags. Do not install or publish the collection root as a plugin.
