# DSH Balance

中文 | [English](README.en.md)

在 DeepSeek Harness 侧栏查看账户余额、今日模型费用和会话消耗，并为不同模型设置单价。

[下载 1.1.0](https://github.com/pipilu123566/deepseek-harness-plugin/releases/tag/%40pipilu123566%2Fdsh-balance%401.1.0) · [问题反馈](https://github.com/pipilu123566/deepseek-harness-plugin/issues)

## 使用演示

打开侧栏钱包 → 查看余额和今日消耗 → 配置模型单价并重算 → 按会话定位花费。

![DSH Balance 1.1.0 功能原型：打开余额概览、保存模型单价并重算费用、按会话查看消耗](https://raw.githubusercontent.com/pipilu123566/deepseek-harness-plugin/main/dsh-balance/media/balance-1.1.0-workflow.zh.gif)

约 14 秒循环，依据 1.1.0 功能绘制，属于功能原型而非操作实录。金额、模型和单价均为演示数据，不代表真实账户、官方报价或账单实扣。静态分步图：[余额概览](media/balance-1.1.0-overview.zh.png) · [配置单价](media/balance-1.1.0-prices.zh.png) · [会话消耗](media/balance-1.1.0-sessions.zh.png)；另有[实际运行的演示数据截图](docs/images/balance-1.1.0-demo.png)。

## 功能

- 侧栏钱包按钮支持悬浮、键盘聚焦和点击固定；按 Escape、点击关闭或面板外部收起。
- 概览显示各已配置来源的可用余额和今日消耗。展开来源可查看充值、赠送及更新时间；同一来源配置多个模型仍只显示一行。
- 今日消耗可按模型或会话查看，会话还可展开模型明细；每轮回复尾部显示该轮费用。
- 在「单价」中按精确的厂商／模型配置输入、输出、缓存命中和缓存创建价格，保存后重算费用，重启后保留。
- 概览金额保留两位小数，展开明细保留精度；不同币种分别展示，不换算汇率。
- 来源列表和消耗明细限高滚动；支持手动刷新，面板打开期间每分钟更新，关闭后停止轮询。
- 缺少凭据、不支持、限流、查询失败、未定价和缺失用量分别提示，不显示为零余额或零消耗。

## 兼容范围

1.1.0 仅声明兼容 **DeepSeek Harness 0.2.1-rc.5**，余额入口位于侧栏底部账户按钮上方的独立行。其他宿主版本需要重新验证。

这些插件首先服务于作者自己的使用需求，未做全面适配测试。公开版本的实际测试平台、安装和交互覆盖见[验收记录](docs/validation.md)。

## 安装与升级

1. 从 Release 下载 [`pipilu123566-dsh-balance-1.1.0.tgz`](https://github.com/pipilu123566/deepseek-harness-plugin/releases/download/%40pipilu123566%2Fdsh-balance%401.1.0/pipilu123566-dsh-balance-1.1.0.tgz)。这是可安装插件包；GitHub 自动生成的源码压缩包不能代替它。
2. 完全退出 Harness，在下载目录执行：

   ```sh
   dsh plugin --profile desktop add ./pipilu123566-dsh-balance-1.1.0.tgz --ignore-scripts
   ```

3. 重新打开 Harness，在侧栏底部找到钱包按钮。厂商连接仍通过 Harness 原有设置配置。

macOS 若没有 `dsh` 命令，可使用应用自带 CLI：

```sh
'/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh' plugin --profile desktop add ./pipilu123566-dsh-balance-1.1.0.tgz --ignore-scripts
```

已有公开版 1.0.0 按相同步骤安装新版。使用已有 Web profile 时，将 `desktop` 换成其名称，并在包变更前后停止、重启实例。同一 profile 只保留一个余额 bundle；不要将父仓库根地址作为插件安装。

卸载前退出目标实例，然后执行并重新打开：

```sh
dsh plugin --profile desktop remove @pipilu123566/dsh-balance
```

## 余额来源

| 厂商 | 来源 | 条件与限制 |
| --- | --- | --- |
| DeepSeek 登录账户 | Harness 账户服务 | 通过 Harness 登录；按币种显示充值与赠送钱包 |
| DeepSeek API | 官方 `/user/balance` | 配置官方 API Key；显示可用、充值和赠送余额 |
| OpenRouter | 官方 `/api/v1/credits` | 需要管理密钥；普通密钥可能无权查询；显示总充值减总消费 |
| 硅基流动 | 官方 `/v1/user/info` | 配置 `api.siliconflow.cn` 密钥；金额为 CNY |
| 百炼／Qwen | 尚未接入余额查询 | 模型调用密钥不能直接查询阿里云账户现金余额；不将账户余额与 Token Plan / Coding Plan 混用 |
| 其他已配置厂商 | 暂不支持余额查询 | 不猜测私有接口；仍可为其模型配置单价并估算已记录用量的费用 |

接口来源：[DeepSeek](https://api-docs.deepseek.com/api/get-user-balance/)、[OpenRouter](https://openrouter.ai/docs/api/api-reference/credits/get-remaining-credits)、[硅基流动](https://github.com/siliconflow/siliconcloud/blob/main/openapi.yaml)、[阿里云账户余额](https://help.aliyun.com/zh/user-center/developer-reference/api-bssopenapi-2017-12-14-queryaccountbalance)。

插件只查询已配置的来源。凭据仅发送到对应 HTTPS 白名单端点；拒绝自定义反向代理、非标准端口、URL 内嵌凭据和接口重定向。余额是带更新时间的查询快照，不代表账户的实时变化。

## 消耗与计价

金额是**模型费用估算，不是厂商扣款账单**。统计范围为当前宿主可访问的会话及其中已记录的模型用量；不包含其他设备、未记录请求，以及搜索、抓取等工具费用。当日按北京时间划分，fork 继承调用不重复计费；推理用量已包含在输出中，不另加一次。

未上报用量、缺少单价和会话读取失败均保留提示。混合结果只汇总已计价部分，并标明部分估算；人民币和美元不合计。会话列表只显示当日有调用的会话，标题来自宿主投影；未命名会话保留明确提示。

内置 DeepSeek 官方路线价格采用 [2026-10-30 核对的官方人民币价格](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/)，按北京时间峰谷时段计算；内置日期覆盖为 2026-09-19 至 2026-12-31。超出日期范围、未知模型和第三方同名模型不会自动套用该价格。价格可能变动，可在「单价」中显式覆盖；本插件不自动更新价格表。

自定义单价按精确 `provider/model` 保存，支持 CNY、USD，单位为所选币种／百万 Token，最多 8 位小数。输入、输出为必填项；缓存价格留空表示未定价，填 `0` 才表示免费。保存会重新计算已有记录；当前配置不能还原厂商过去的价格和真实账单。恢复默认后，官方路线使用内置价格，其他路线保持未定价。并发配置变更会拒绝覆盖，需要重新载入后再编辑。

## 数据与开发

API Key 和原始厂商响应留在 Host；页面接收余额、用量、模型标识和会话标题等展示字段，不返回会话正文。插件不增加分析追踪或独立后端；余额查询不追加会话事件，单价通过 Harness 设置服务保存。

使用仓库声明的 Node **22.21.1**、pnpm **10.33.2** 和锁文件，在插件目录执行：

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm test
pnpm pack --out /path/to/output/dsh-balance.tgz
```

Host 使用 Cordis、Typert、会话查询与投影服务；Client 复用宿主 React、主题及语言服务，在侧栏和回复尾部的公开槽位显示内容。卸载时释放监听器、计时器、浮层、观察租约和在途请求。详见[贡献说明](CONTRIBUTING.md)与[验收记录](docs/validation.md)。

## 许可证

[MIT](LICENSE)。第三方依赖保留各自的许可证。
