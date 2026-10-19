# Publishing CeenJs6

The Marketplace identity is `yeceen.ceenjs6`; the display name is `CeenJs6`.
Source: https://github.com/suminwell/CeenJs6-VSCode-Extension.

## Build and verify

Use Node.js 22 or later:

```sh
npm ci
npm test
npm run package
```

Install the resulting VSIX for device acceptance. Protocol regression tests use
simulated CeenJs6 peers; a green build alone does not prove a real-device connection.
## Release numbering

`ceen-version.json` is the source of truth. CEEN release numbers and GitHub tags
use `UPSTREAM.REVISION`, for example `1.0.14.1`, then `1.0.14.2`. After merging
upstream `1.0.15`, the next CEEN release starts at `1.0.15.1`.

For another release on the same upstream baseline:

```sh
npm run release:prepare
```

After merging a newer upstream baseline:

```sh
npm run release:prepare -- 1.0.15
```

Both commands synchronize `ceen-version.json`, `package.json` and
`package-lock.json`. `npm run release:sync` repairs derived metadata after merge
conflicts without incrementing the revision. Compilation, tests and packaging
run `version:check` to reject inconsistent files.

VSCode / VSCE requires a three-component SemVer version in `package.json`.
The Marketplace patch is `upstreamPatch * 1000 + revision`, reserving three
revision digits (1 through 999) per upstream patch:

| CEEN release / GitHub tag | Marketplace manifest version |
| --- | --- |
| 1.0.14.1 | 1.0.14001 |
| 1.0.14.2 | 1.0.14002 |
| 1.0.15.1 | 1.0.15001 |

The four-part release is also stored as `package.json.ceenVersion`; the real
protocol baseline is `package.json.upstreamVersion`. Android handshake version
checks use this baseline, so a large encoded Marketplace patch cannot claim
compatibility with a newer upstream protocol. The hello also includes the
four-part `ceenVersion` as additional metadata.

`npm run package` names the VSIX after the CEEN release, such as
`ceenjs6-1.0.14.1.vsix`; an explicit `--out` is supported for CI. GitHub releases
use `v1.0.14.1`-style tags. Keep the already published `1.0.14` as historical
release metadata; future releases follow this scheme.

## Marketplace authentication

Publisher `yeceen` already uses Microsoft Entra ID / GitHub OIDC through
`ceendev/har-assist`'s `marketplace` environment. Its federated identity is scoped
to that repository. `publish-ceenjs6.yml` in that repository provides the CeenJs6
publishing entry point, reusing the existing identity without a stored PAT.
The workflow checks out a full source commit from this repository, runs tests,
checks the extension identity, builds the VSIX, then publishes it with VSCE.

After pushing a reviewed source commit:

```sh
gh workflow run publish-ceenjs6.yml --repo ceendev/har-assist --ref ceen \
  -f source_sha=FULL_40_CHARACTER_SOURCE_COMMIT
```

Inspect the build and publish jobs and the public Marketplace version before
reporting success. The local `npm run publish` command is available for an
independently authenticated VSCE session. Never commit credentials.

The project also has its own GitHub build workflow to produce a tested VSIX.
A future dedicated Entra federated credential for this repository can replace
the existing publishing entry point without changing the Marketplace identity.
