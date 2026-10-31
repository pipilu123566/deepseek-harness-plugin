# HTTPS 与中继配置

中文 | [English](deployment.en.md)

插件不会创建域名、隧道、证书或开机启动项。复用已有的受认证 DSH HTTPS 服务时，直接安装并从侧栏进入即可；独立部署必须自行提供网络入口和 DSH 所有者认证。

## DSH 配置

在目标 profile 的用户 `cordis.patch.yml` 中对插件行添加配置，保留已有配置：

```yaml
- id: pipilu-remote-desktop
  config:
    publicUrl: https://remote.example.com
```

`publicUrl` 为 HTTPS 根地址，不能包含路径、查询参数或用户名密码；它决定手机登录链接的域名。不配置时使用 DSH Web Server 的 origin。入口路径为 `/remote-desktop/`，登录入口为 `/remote-desktop/login`；授权继续使用 DSH 官方连接服务。

## 可选 Cloudflare 转接示例

`deploy/https-relay.mjs` 只监听回环地址，校验公网 Host 和 HTTPS 转发标记，并将响应 Cookie 添加 Secure。示例假定 DSH Web 服务已在 `127.0.0.1:18326` 运行：

```sh
DSH_PUBLIC_HOST=remote.example.com DSH_UPSTREAM_PORT=18326 DSH_RELAY_PORT=18325 node deploy/https-relay.mjs
```

为自己的专用 Cloudflare Tunnel 使用 `deploy/cloudflared.example.yml`，替换隧道 UUID、凭据绝对路径和域名。隧道入口指向 `http://127.0.0.1:18325`。凭据文件由部署者保管，不放入插件或 Git。此转接仅供本机隧道连接，不是任意反向代理的通用信任边界。

这份示例不配置 DSH 的监听端口、受信任域名或生命周期。应按目标 DSH 版本的实际部署选项建立完整的受认证 HTTPS 入口，再测试生成的登录链接和 API 鉴权。首次授权须在 Mac 完成；插件不能从外网给自己开启系统权限。

## 可选 TURN

默认 ICE 配置为 `stun:stun.cloudflare.com:3478`。需要 TURN 时，在同一插件行配置标准 `iceServers`：

```yaml
- id: pipilu-remote-desktop
  config:
    publicUrl: https://remote.example.com
    iceServers:
      - urls: ["stun:stun.cloudflare.com:3478"]
      - urls: ["turns:turn.example.com:5349?transport=tcp"]
        username: YOUR_SHORT_LIVED_USERNAME
        credential: YOUR_SHORT_LIVED_CREDENTIAL
    relayOnly: false
```

值均为占位示例，不提供可直接使用的 TURN 服务。不要提交真实凭据；自行签发短期凭据并管理更新。本版没有内置 TURN 凭据签发或自动轮换服务。`relayOnly: true` 强制中继，可用于验证自己的 TURN 部署；未配置有效 TURN 时会连接失败。HTTPS 网页可打开并不证明媒体和输入通道已经连通。
