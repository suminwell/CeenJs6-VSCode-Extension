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
Increment `package.json` and synchronize `package-lock.json` for every publication.

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
