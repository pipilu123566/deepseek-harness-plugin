# deepseek-harness-plugin

中文 | [English](README.en.md)

独立开发的 DeepSeek Harness 社区插件集合。每个插件在一个独立子目录中维护源码、依赖、测试和说明，并单独发布安装包。

**非官方社区项目，与 DeepSeek 无隶属关系，未获官方背书。**

## 开发与维护说明

这些插件都源于我自己的实际需求，首先服务于个人使用，并未进行全面的兼容性与适配测试。各插件已验证的范围以对应说明为准。

欢迎通过 [Issues](https://github.com/pipilu123566/deepseek-harness-plugin/issues) 提出问题和建议。如果某项需求对我自己也有用，我会积极开发；其他需求大概率不会实现。也欢迎 Fork 到自己的仓库，按自己的需要继续开发和完善。

我还是编程新手，这些插件全部通过 AI 开发完成。代码和设计如有不足，欢迎指正。

## 插件

| 插件 | 用途 | 已发布版本与安装 | 兼容宿主 |
| --- | --- | --- | --- |
| [DSH Balance](dsh-balance/README.md) | 在侧栏集中查看已配置厂商的账户余额 | [1.0.0 Release](https://github.com/pipilu123566/dsh-balance/releases/tag/v1.0.0) | DeepSeek Harness 0.2.1-rc.5 |

余额插件已迁入 [`dsh-balance/`](dsh-balance/)，原公开提交历史保留。原仓库继续提供 1.0.0 下载、固定版本截图和验收记录；后续源码与问题反馈统一在本仓库维护。本次整理未新增或替换安装包。

仓库根目录不是插件。安装时进入对应插件说明，下载该插件的 Release `.tgz`，不要把本仓库根地址直接交给插件安装命令。已发布版本的支持范围以其 README 和验收记录为准。

## 目录与开发

```text
deepseek-harness-plugin/
├── README.md
├── README.en.md
├── CONTRIBUTING.md
├── LICENSE
└── dsh-balance/
    ├── package.json
    ├── pnpm-lock.yaml
    ├── README.md
    ├── README.en.md
    ├── LICENSE
    └── 源码、测试与文档
```

后续插件在根下新建独立目录；每个目录保留自己的版本、依赖、锁文件、测试与安装说明。开发和打包在目标插件目录内执行，不需要同时安装所有插件的依赖。详见[贡献与发布约定](CONTRIBUTING.md)。

问题反馈请在 [Issues](https://github.com/pipilu123566/deepseek-harness-plugin/issues) 中注明插件名称、版本和宿主版本。余额插件的[官方展示帖](https://github.com/deepseek-ai/deepseek-harness/discussions/11526)继续使用原帖。

## 许可证

自有代码采用 [MIT](LICENSE)。每个插件的安装包包含其许可证；第三方依赖保留各自许可。
