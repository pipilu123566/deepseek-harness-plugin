# Repository conventions

- Documentation is Chinese-first: use Chinese in README.md and a complete English version in README.en.md, with language links at the top. Keep installation steps, support scope and limitations aligned. Preserve existing language-specific links when reorganizing files.
- Maintain each plugin in its own top-level directory. The repository root is a catalog, not an installable package.
- Read the target plugin's README, package.json, lockfile and validation notes before changing it. Run commands inside that plugin directory using its declared toolchain.
- Preserve package names, host/client registration identities and declared compatibility unless the task calls for changing them.
- Public files must not include credentials, enterprise-private adapters, local runtime state, private fixtures or nested Git repositories.
- Build releases from a clean commit and record the plugin directory, package version, full-package-name@version tag, artifact hash and tested host.
- dsh-balance was discontinued on 2026-11-06 and the separate pipilu123566/dsh-balance repository is archived. Its directory stays in this repository read-only for existing users: keep the source, tags and the @pipilu123566/dsh-balance@1.1.0 release immutable, accept no fixes, and release no new versions.
