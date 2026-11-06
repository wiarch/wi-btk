# Security Policy

## Scope
WI-BTK is a desktop utility suite with modules that may access screen contents, microphone/audio devices, keyboard and mouse input, files, network connections, and system settings. Treat these capabilities as security-sensitive.

## Reporting
Do not publish credentials, private files, personal data, or exploit details in public issues. Use GitHub's private vulnerability reporting feature if enabled for this repository, or contact the maintainers through a verified private channel.

## Development requirements
- Follow the WI Arch security baseline.
- Keep Electron context isolation enabled and Node integration disabled in renderer processes.
- Validate IPC senders and payloads.
- Request only the capabilities a module needs and disclose sensitive permissions.
- Verify module signatures and digests before installation or update.
- Do not execute arbitrary remote scripts or load remote executable code into the host.
- Keep user data separate from module binaries and preserve it during uninstall only according to explicit user choice.
- Do not claim module isolation, signed distribution, or automatic rollback until implemented and tested.
