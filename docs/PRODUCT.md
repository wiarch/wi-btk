# WI-BTK Product Definition

## Positioning

WI-BTK (WI Basic Tool Kit) is a modular desktop utility suite for Windows and Linux. It provides one lightweight host application through which users can discover and manage optional tools.

WI-BTK is the product and application shell. **WI-Rec is one module**, dedicated to screenshot capture, screen/audio recording, annotation, and color picking. WI-Rec is not the name of the complete suite.

## Product principles

- **Lightweight core:** install only the host, shared runtime, and essential services.
- **On-demand modules:** users choose which tools to download and install from an integrated catalog.
- **Independent lifecycle:** install, update, disable, repair, and uninstall modules individually.
- **Cross-platform by design:** modules declare OS, architecture, desktop-session, and dependency requirements.
- **Honest compatibility:** unsupported features are marked unavailable rather than presented as working.
- **Local-first:** tools should work locally without an account or cloud dependency unless a feature explicitly requires a service.
- **Safe extensibility:** module packages are versioned, integrity-checked, signed, permission-scoped, and installed transactionally.

## Current repository state

The repository already contains a substantial Electron/TypeScript desktop application and a set of tool modules, including WI-Rec, WI-Click, WI-Button, WI-Booster, WI-Calc, WI-Clock, WI-Notes, WI-Rate, WI-Netest, WI-Cam, WI-View, WI-Remote, WI-Weather, WI-Widget, WI-System, WI-Dimmer, WI-Translate, WI-Draw, and WI-Device.

The current host imports and registers many modules from the main process, and their code is part of the application package. The existing enabled/disabled settings are not equivalent to downloading or uninstalling a module.

**The integrated module catalog, separate module packages, on-demand download/install/update/uninstall flow, and full dependency isolation are planned capabilities. They are not implemented by this documentation and must not be advertised as currently available.**

## Application model

### Core application

The core is responsible for:
- app lifecycle, tray, settings, navigation, notifications, and global shortcuts;
- module catalog and installed-module inventory;
- compatibility checks and dependency resolution;
- verified package download and installation;
- module lifecycle and permissions;
- update, rollback, repair, and uninstall operations.

The core should not bundle optional module assets or heavy native dependencies unless required by the host.

### Modules

Each module is a separately versioned feature package. Examples include:
- **WI-Rec:** screen capture, recording, annotations, color picker.
- **WI-Click:** click automation.
- **WI-Booster:** system tuning utilities, currently Windows-specific for advanced controls.
- **WI-Calc / WI-Clock / WI-Notes:** productivity tools.
- **WI-Remote:** remote access/control capabilities.
- **WI-View:** media viewing utilities.
- **WI-Draw:** drawing and whiteboard utilities.

Module names and feature availability must be grounded in the implementation. The catalog must distinguish stable, experimental, planned, and unsupported states.

## Supported operating systems

- Windows 10/11 x64 is a primary target.
- Linux x64 is a first-class target for the host and modules whose dependencies and APIs support it.
- Linux distributions and desktop sessions differ. X11, Wayland, PipeWire, portals, DBus, permissions, and native packages must be modeled as explicit compatibility requirements.
- A module may be Windows-only, Linux-only, or support both. Platform support must be shown per module, not inferred from the host installer.

## Proposed technical direction

The existing application uses Electron 35, TypeScript 5.8, and electron-builder. Retain the current stack unless a measured architectural reason justifies a change.

Recommended module architecture:
1. Electron host/core with a stable, versioned module API.
2. A local module manifest and installation registry.
3. A signed catalog describing module versions, platform targets, dependencies, permissions, package size, hashes, and release notes.
4. Separately distributed module packages downloaded on demand.
5. A compatibility and dependency resolver before installation.
6. Transactional install/update with staging, integrity verification, atomic activation, and rollback.
7. A least-privilege IPC bridge between module renderer and host services.

The catalog service should distribute metadata and artifacts only. It must not be able to silently execute arbitrary remote code in the host.

## Non-goals

- Installing every utility by default.
- Claiming every module supports Windows and Linux equally.
- Running arbitrary scripts from a module catalog.
- Treating module visibility toggles as module installation/uninstallation.
- Requiring an online account for local tools without a clear product reason.
