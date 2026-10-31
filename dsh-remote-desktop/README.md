# DSH 远程桌面

中文 | [English](README.en.md)

通过手机浏览器查看和操作 Mac，支持键鼠、文字与普通密码框输入、双指缩放和平移。独立社区插件，不调用模型，不暂停或继续 AI 任务。

**0.3.6 公开预览版**，兼容 DeepSeek Harness **0.2.1-rc.5**。电脑端仅支持 **Apple Silicon Mac、macOS 13 及以上**。目前网页和 Mac 权限窗口主要使用中文。

## 使用演示

Mac 授权与准备 → 手机打开本人访问链接 → 缩放、平移定位 → 点选输入框发送文字，结束后断开。

![DSH 远程桌面 0.3.6 功能原型：Mac 权限准备、手机连接、缩放定位、文字输入与断开连接](https://raw.githubusercontent.com/pipilu123566/deepseek-harness-plugin/main/dsh-remote-desktop/media/remote-0.3.6-workflow.zh.gif)

约 14 秒功能原型，依据 0.3.6 公开预览版绘制，使用合成桌面和演示数据；不是实际手机录屏，也不证明锁屏解锁或真实 iPad 已通过验收。演示不生成真实登录链接或二维码。静态分步图：[连接准备](media/remote-0.3.6-setup.zh.png) · [缩放定位](media/remote-0.3.6-zoom.zh.png) · [文字输入](media/remote-0.3.6-input.zh.png)。

另有 [0.3.3 浏览器手机尺寸测试截图](docs/mobile-zoom-demo.png)，使用合成画面，输入不会操作 Mac；0.3.6 沿用同一远控界面。手机仍需能访问运行插件的 DSH HTTPS 入口，插件不会自动开通公网服务。

## 安装

从 [0.3.6 Release](https://github.com/pipilu123566/deepseek-harness-plugin/releases/tag/%40pipilu%2Fdsh-remote-desktop%400.3.6) 下载 `pipilu-dsh-remote-desktop-0.3.6.tgz` 和 `SHA256SUMS`。在两份文件所在目录运行 `shasum -a 256 -c SHA256SUMS`。

在 DeepSeek Harness 的插件管理中选择下载的 `.tgz` 并启用。Web CLI 可在目标 Web profile 中安装本地包：

```sh
dsh plugin --profile <你的 Web profile> add /绝对路径/pipilu-dsh-remote-desktop-0.3.6.tgz --ignore-scripts
```

安装后从侧栏打开「远程桌面」。仓库根目录不是插件；包名仍为 `@pipilu/dsh-remote-desktop`，本版不发布到 npm。

## 连接和操作

1. 在 Mac 上运行 DeepSeek Harness。首次使用点击「在 Mac 设置权限」，完成屏幕录制与辅助功能授权，再刷新状态。系统设置中的权限归属可能显示为 DeepSeek Harness。
2. 点击「连接这台 Mac」。点按电脑画面中的目标位置后，可以拖动、滚动、使用快捷键，或从下方发送文字及密码。密码选项只隐藏网页输入，不替代应用自身的登录验证；发送后输入栏清空。
3. 手机首次访问时，在已登录的 Mac 页面展开「在手机或 iPad 上打开」，准备二维码或复制本人完整登录链接，在手机浏览器打开。二维码在本地生成，60 秒后或切换后台时清除；清除二维码不会撤销已签发的 DSH 所有者授权。登录链接拥有 DSH 所有者访问权，不应转发。
4. 双指张合连续缩放，范围为适应屏幕的 1–8 倍。放大后双指平移；开启「移动画面」可单指平移。适应屏幕时双指滚动电脑内容。下方「−」「＋」「适应屏幕」提供按钮操作和复位；旋转设备后保留缩放倍数。
5. 操作结束点击「断开连接」，或在 Mac 菜单栏的「远控」中断开。断开只结束远控，不关闭 Mac 或其他应用。

普通网址不自带授权。微信内浏览器、Safari 和 Chrome 的登录状态可能不共享，更换浏览器后应在同一浏览器打开完整登录链接。未授权访问显示设备授权指引，API 仍拒绝匿名请求。Host 重启后旧登录链接可能失效，需要重新生成。

## 手机和外网访问

插件不会自动开通公网服务。手机必须能访问运行插件的 DSH HTTPS 入口；仅在 Mac 回环地址运行的页面不能直接从手机访问。公网部署使用自己的域名、HTTPS 反向代理或隧道，保留 DSH 所有者认证、原始 `Host` 和 `Origin`，不要直接公开无认证的本地端口。部署说明见 [HTTPS 与中继配置](docs/deployment.md)。

默认使用 STUN 尝试 WebRTC 直连。HTTPS 隧道只承载网页和信令，不等于 TURN 媒体中继；无法直连的网络可能需要配置自己的 `iceServers`。当前不提供 TURN 账号或中继服务。

## 支持范围与已知限制

| 项目 | 范围 |
| --- | --- |
| Mac | Apple Silicon、macOS 13+；Intel、Windows、Linux 未支持 |
| 画面 | 当前主显示器，宽度上限 1920，采集目标 30 fps；无音频、多显示器切换或文件传输 |
| 输入 | 鼠标、快捷键、Unicode 文字与普通密码框；不承诺所有系统安全输入场景 |
| 移动端 | 用户已确认手机连接、操作、断开及双指缩放；真实 iPad、所有浏览器和不同网络尚未逐项验证 |
| 睡眠与锁屏 | 连接前唤醒显示器，会话期间保持屏幕和系统唤醒，断开后释放；整机休眠唤醒、锁屏密码输入与解锁仍待验证 |
| 原生助手 | 随包提供 0.3.0 助手，解压时校验 SHA-256 和应用签名；本地临时签名，未做 Apple 公证 |

Mac 必须保持开机、联网并运行 DeepSeek Harness。显示器唤醒不取消系统锁屏，不支持 FileVault 重启前解锁或替代 Touch ID。0.3.5 已在锁屏 Mac 验证休眠显示器唤醒后能启动采集，尚未收到该修复后的手机完整复测结果；不能据此认定锁屏画面和密码输入均可用。

## 实现与数据

ScreenCaptureKit 采集 → WebRTC 视频 → 浏览器；键鼠和文字经 WebRTC DataChannel 发送，由 Mac 的 CGEvent／辅助功能执行。DSH Host 负责所有者认证和单连接租约，原生助手通过子进程标准输入／输出管理，没有新增本地 TCP 控制端口。原生实现不依赖 macOS 屏幕共享。

连接状态仅保存在内存，未建立通道的预约 15 秒后释放。信令只允许 SDP 和 ICE；文字、密码和桌面画面不写入聊天或插件诊断日志。主动断开、通道关闭或插件停止时释放输入状态并结束对应助手和唤醒保持进程。插件不持久保存输入或录制桌面；DSH 自身的认证 Cookie 由宿主管理。

## 开发与构建

使用 Node **22.21.1**、pnpm **10.33.2** 和本目录的锁文件。在插件目录运行：

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm test
pnpm build
pnpm pack --pack-destination /绝对路径/输出目录
```

仓库包含已签名助手压缩包，日常网页修改不需要重编原生助手。重编需要 macOS、Swift **6.3.3**（Swift tools 5.10 模式）：先按 `native/vendor-lock.json` 下载 WebRTC **156.0.0**，核对 SHA-256，将 XCFramework 解压为 `native/Vendor/WebRTC.xcframework`，再运行 `pnpm build:agent`。此命令更新助手压缩包、临时签名及清单哈希。

测试覆盖认证、权限、租约、信令隔离、断开清理、唤醒期间取消和缩放坐标。发布验收与尚未覆盖的场景见 [验收记录](docs/validation.md)。

## 许可与反馈

自有代码沿用父仓库的 [MIT 许可](LICENSE)。WebRTC 保留 [Google WebRTC 许可](third-party/WebRTC-LICENSE)，原生压缩包内同时附带该许可；JS 依赖保留各自许可。问题请提交到 [Issues](https://github.com/pipilu123566/deepseek-harness-plugin/issues)，注明插件版本、宿主版本、macOS 和手机浏览器，不要附登录链接、密码或 Cookie。
