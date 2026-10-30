# Repository conventions

- Maintain each plugin in its own top-level directory. The repository root is a catalog, not an installable package.
- Read the target plugin's README, package.json, lockfile and validation notes before changing it. Run commands inside that plugin directory using its declared toolchain.
- Preserve package names, host/client registration identities and declared compatibility unless the task calls for changing them.
- Public files must not include credentials, enterprise-private adapters, local runtime state, private fixtures or nested Git repositories.
- Build releases from a clean commit and record the plugin directory, package version, full-package-name@version tag, artifact hash and tested host.
- The old pipilu123566/dsh-balance repository retains immutable v1.0.0 downloads. New source work belongs here; do not maintain two code copies or overwrite that release.
