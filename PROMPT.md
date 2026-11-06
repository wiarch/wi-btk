# WI-BTK — Implementation Brief

Build WI-BTK as a lightweight modular desktop utility suite for Windows and Linux. The product name is WI-BTK. WI-Rec is a module for screen capture and recording, not the name of the complete application.

## Product experience
The user installs a small WI-BTK host application, opens an integrated catalog, browses available tools, and installs only the modules they want. The user can inspect platform compatibility, download size, installed size, dependencies, permissions, and release notes before installing. Modules can be updated, disabled, repaired, and uninstalled individually.

## Important current-state constraint
This repository already contains many Electron/TypeScript tool implementations. Most are currently bundled and registered by the host. Existing enabledApps settings are not a true module installer. Inspect the current code and migrate incrementally; do not claim the modular catalog exists until it works.

## Platform targets
- Windows 10/11 x64.
- Linux x64, with explicit X11/Wayland and desktop dependency handling.
- Keep Windows-specific system controls gated to Windows.
- Test screen capture, recording, hotkeys, audio, and multi-monitor behavior on representative Linux desktops.
- The host's Linux packaging targets do not prove all modules are Linux-compatible.

## Recommended implementation sequence
1. Audit current modules, imports, dependencies, platform APIs, and permissions.
2. Define a stable versioned host/module API and schema-validated module manifest.
3. Add a local installed-module registry, separating installed from enabled.
4. Select one low-risk module and package it independently as a vertical slice.
5. Implement signed catalog metadata, verified artifact downloads, staged installation, atomic activation, rollback, and uninstall.
6. Build the catalog UI with compatibility, storage, permission, and dependency information.
7. Migrate other modules incrementally and remove optional code/dependencies from the core.
8. Add per-module CI, Windows/Linux validation, update tests, and security checks.

## Security requirements
- No arbitrary remote code or scripts from catalog metadata.
- Verify trusted publisher signatures and package digests before activation.
- Use least-privilege Electron IPC and validate sender and payloads.
- Keep Node integration disabled in renderer processes and preserve context isolation.
- Scope permissions per module and ask before granting sensitive capabilities.
- Keep user settings/data separate from executable module packages.
- Make install/update transactional with rollback.
- Protect signing keys and catalog publishing credentials.
- Follow the WI Arch security baseline.

## First delivery
Do not attempt the entire marketplace at once. Deliver:
- a module inventory and platform compatibility audit;
- module manifest schema and host API proposal;
- local module registry;
- one independently packaged module;
- verified installation and rollback tests;
- updated README, architecture, roadmap, and security documentation.

Keep WI-BTK lightweight, preserve existing working tools, and report feature status honestly.
