# HTTPS and relay configuration

[中文](deployment.md) | English

The plugin does not create domains, tunnels, certificates or startup services. An existing authenticated DSH HTTPS deployment can load it directly; a new deployment must provide its own endpoint and DSH owner authentication.

## DSH configuration

Merge this entry into the target profile's user `cordis.patch.yml`, preserving existing settings:

```yaml
- id: pipilu-remote-desktop
  config:
    publicUrl: https://remote.example.com
```

`publicUrl` must be an HTTPS root without a path, query, username or password. It determines the mobile login URL's domain. When omitted, the DSH Web Server origin is used. The page is `/remote-desktop/` and its login endpoint is `/remote-desktop/login`; authorization uses the official DSH connection service.

## Optional Cloudflare relay example

`deploy/https-relay.mjs` listens on loopback, checks the public Host and HTTPS forwarding header, and adds Secure to response cookies. This example assumes DSH is already running at `127.0.0.1:18326`:

```sh
DSH_PUBLIC_HOST=remote.example.com DSH_UPSTREAM_PORT=18326 DSH_RELAY_PORT=18325 node deploy/https-relay.mjs
```

Use `deploy/cloudflared.example.yml` with your own dedicated Cloudflare Tunnel, replacing the UUID, absolute credential-file path and domain. Point the tunnel to `http://127.0.0.1:18325`. Keep tunnel credentials outside the plugin and Git. This relay is intended for a local tunnel process, not as a general trust boundary for arbitrary reverse proxies.

The example does not configure DSH's listener port, trusted hosts or lifecycle. Establish a complete authenticated HTTPS deployment using the actual options of your DSH version, then check generated login URLs and API authentication. Initial macOS permission grants require local approval; the plugin cannot grant itself permissions remotely.

## Optional TURN

The default ICE server is `stun:stun.cloudflare.com:3478`. To use TURN, configure standard `iceServers` on the same plugin entry:

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

These are placeholders, not a provided TURN service. Do not commit actual credentials. Issue short-lived credentials yourself and manage renewal; this plugin does not issue or automatically rotate them. `relayOnly: true` forces relay use to test your TURN deployment and fails without valid TURN configuration. Loading an HTTPS page does not prove media or input connectivity.
