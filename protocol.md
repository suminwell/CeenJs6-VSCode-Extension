# CeenJs6 device protocol

Checked against suminwell/CeenJs6 commit f2fb49d48898a5e28deb6af1ff521a9c9bcb2a5c.

- Computer TCP listener: 6347. Android TCP listener: 7347.
- Each frame: 8-byte header (`int32BE` payload byte length, `int32BE` type), then payload.
- Type 1: UTF-8 JSON. Type 2: binary ZIP payload for project synchronization.
- Maximum incoming frame: 64 MiB. Both peers exchange `hello`.
- Android hello data: `device_name`, `device_id`, `app_version`, `app_version_code`.
- Extension hello data: `extensionVersion` (actual three-part upstream protocol baseline), `ceenVersion` (four-part CEEN release), optional `errorMessage`. The encoded Marketplace version must not be used for protocol compatibility checks.
- Script commands remain `run`, `stop`, `stopAll`, `save`.
- Project commands remain `bytes_command` plus MD5, ZIP data and command metadata.
- Device-triggered commands retain their names and route to VSCode's `ceenjs6.*` commands.

The optional local HTTP control interface is separate from this TCP protocol.
