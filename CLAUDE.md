# WI-BTK — Agent Instructions

## Product identity
WI-BTK is the full desktop suite. WI-Rec is only the screen capture/recording module. Do not rename the entire product WI-Rec.

## Current state
The repository contains an Electron 35 / TypeScript 5.8 desktop application with multiple tool modules. Many modules are currently bundled into the same application and registered from the main process. Existing enable/disable settings do not mean a module is separately installed or downloaded.

The on-demand catalog, separate module packages, and module install/update/uninstall lifecycle are planned, not implemented. Never describe them as shipped features.

## Platform requirements
- Windows 10/11 x64 and Linux x64 are product targets.
- Do not assume platform parity. Gate platform-specific code and declare compatibility per module.
- Test X11 and Wayland separately. Screen capture, recording, audio, hotkeys, portals, PipeWire, DBus, and compositor behavior require Linux-specific validation.
- WI-Booster advanced controls currently rely on Windows-specific APIs/PowerShell; do not imply those controls work on Linux.

## Architecture rules
- Preserve module IDs and user data unless a migration is explicitly planned.
- Separate host services from module features.
- Design a stable, versioned module API and manifest before moving modules into separate packages.
- Do not perform a bulk rewrite. Prove packaging and lifecycle with one low-risk module first.
- Keep settings and user data outside executable package directories.
- Module install/update must be transactional and support rollback.
- Never execute arbitrary scripts or remote code supplied by a catalog response.

## Security requirements
- Follow the WI Arch security baseline.
- Use Electron context isolation, sandboxing where compatible, no Node integration in renderers, and narrow preload/IPC bridges.
- Validate IPC sender identity and all payloads.
- Apply least privilege per module. Screen capture, microphone, global input automation, remote control, filesystem, and system settings require explicit capability declarations and user-facing consent.
- Verify package signatures and digests before install or update.
- Protect signing keys and catalog publishing credentials.
- Keep user data separate from module executable files.
- Never log secrets or user content.

## Engineering workflow
1. Inspect existing implementation and preserve working behavior.
2. Identify the actual status: implemented, partial, planned, or unsupported.
3. Add tests for platform gates, module lifecycle, migration, integrity verification, and rollback.
4. Run available build/typecheck/test scripts and report exact outcomes. Do not invent a test command if package scripts do not define one.
5. Update docs and compatibility declarations alongside code.
