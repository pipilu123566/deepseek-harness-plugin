# DSH Balance

中文 | [English](README.en.md)

当前源码统一在 `deepseek-harness-plugin/dsh-balance` 维护。已发布的 1.0.0 安装包继续从原仓库下载；本次目录整理未替换或重新发布该版本。

[下载版本](https://github.com/pipilu123566/dsh-balance/releases) · [问题反馈](https://github.com/pipilu123566/deepseek-harness-plugin/issues)

在 DeepSeek Harness 侧栏集中查看已配置厂商的账户余额。

**非官方社区插件，由社区成员独立开发和维护，与 DeepSeek 无隶属关系，未获官方背书。**

![DSH Balance 在隔离 Harness 实例中显示演示余额](docs/images/balance-demo.jpg)

截图来自实际运行的隔离 Harness 实例，使用演示余额，不含真实账户信息，也不代表真实厂商查询结果。

## 功能

- 悬浮或键盘聚焦钱包按钮展开面板，点击固定。
- 集中查看 DeepSeek 登录账户、DeepSeek API、OpenRouter 和硅基流动配置。
- 支持手动刷新；面板打开期间每分钟更新，关闭后停止轮询。
- 不同币种和钱包类别分开显示，不换算汇率，不估算剩余 Token。
- 分别显示凭据缺失、不支持、限流和失败，不把错误显示为零余额。

## 兼容范围

1.0.0 仅声明兼容 **DeepSeek Harness 0.2.1-rc.5**。侧栏使用公开 footer 槽位，余额入口独占账户按钮上方一行；后续宿主版本需重新验收。

本次发行验收使用 macOS 上的隔离 Harness Web profile 和实际安装包，具体范围见[验收记录](docs/validation.md)。自动测试不使用 DeepSeek API Key、OpenRouter 或硅基流动的真实账户凭据。

## 安装

1. 从 Release 下载 [`pipilu123566-dsh-balance-1.0.0.tgz`](https://github.com/pipilu123566/dsh-balance/releases/download/v1.0.0/pipilu123566-dsh-balance-1.0.0.tgz)。这是可安装插件包；GitHub 自动生成的源码压缩包用于源码查阅。
2. 完全退出 Harness，在下载目录执行：

   ```sh
   dsh plugin --profile desktop add ./pipilu123566-dsh-balance-1.0.0.tgz --ignore-scripts
   ```

3. 重新打开 Harness，在侧栏底部账户区域上方找到钱包按钮。厂商连接仍通过 Harness 原有设置配置。

macOS 若没有 `dsh` 命令，可使用应用自带 CLI：

```sh
'/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh' plugin --profile desktop add ./pipilu123566-dsh-balance-1.0.0.tgz --ignore-scripts
```

使用已有 Web profile 时，将 `desktop` 换成其名称，并在包变更前后停止、重启该实例。同一 profile 只使用一个余额 bundle。升级时按相同步骤安装新版包，不自行扩大宿主兼容范围。

卸载前退出目标实例，然后执行以下命令并重新打开：

```sh
dsh plugin --profile desktop remove @pipilu123566/dsh-balance
```

## 厂商支持

| 厂商 | 来源 | 条件与限制 |
| --- | --- | --- |
| DeepSeek 登录账户 | Harness 账户服务 | 通过 Harness 登录；充值和赠送钱包分别显示 |
| DeepSeek API | 官方 `/user/balance` | 配置官方 API Key；展示可用、充值和赠送余额 |
| OpenRouter | 官方 `/api/v1/credits` | 需要管理密钥；普通密钥可能无权查询；展示总充值减总消费 |
| 硅基流动 | 官方 `/v1/user/info` | 配置 `api.siliconflow.cn` 密钥；金额为 CNY |
| 其他已配置厂商 | 不猜测私有接口 | 显示暂不支持；未配置的目录项不展示 |

接口来源：[DeepSeek](https://api-docs.deepseek.com/api/get-user-balance/)、[OpenRouter](https://openrouter.ai/docs/api/api-reference/credits/get-remaining-credits)、[硅基流动](https://github.com/siliconflow/siliconcloud/blob/main/openapi.yaml)。

插件拒绝自定义反向代理、非标准端口、URL 内嵌凭据和接口重定向。各厂商凭据仅发送到对应 HTTPS 白名单端点。密钥留在 Host，Client 仅接收有限的余额与状态字段；插件不增加分析追踪或独立后端。

## 开发

使用仓库声明的 Node **22.21.1**、pnpm **10.33.2** 和锁文件；运行依赖与目标 Harness 版本一致。

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm test
pnpm pack --out /path/to/output/dsh-balance.tgz
```

bundle 注册 Cordis Host 服务，通过 Typert 提供只读接口，并使用 `sidebar.footer.action` 槽位。Client 复用宿主 React、主题和语言服务；卸载时清理计时器、监听器、浮层、缓存及在途请求。

发行前用新的 `DSH_HOME` 安装实际 tarball，不复制真实账户数据。本机 `link:` 成功不代替安装包验收。详见[贡献说明](CONTRIBUTING.md)与[验收记录](docs/validation.md)。

## 许可证

[MIT](LICENSE)。第三方依赖保留各自的许可证。
