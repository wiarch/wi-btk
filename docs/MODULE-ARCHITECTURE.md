# WI-BTK Modular Architecture

## Objective

Make WI-BTK a lightweight host application that can download and manage optional tools individually. The target experience is similar to an application store or extension manager, but module execution must remain controlled by the desktop host.

## Current implementation versus target

### Current state observed in source
- Electron 35 and TypeScript 5.8 desktop host.
- Tool implementations live under `src/apps/<module-id>`.
- The main process imports and registers many modules directly.
- Module enablement settings can toggle some features, but code and assets are still part of the app package.
- No separate module artifact/catalog/install/uninstall system was identified in the reviewed source.

### Target state
- Base installer contains only the host and essential shared runtime.
- Optional modules are independent packages and are not downloaded until selected.
- The host exposes a versioned module API and a constrained IPC bridge.
- A catalog provides platform-aware module metadata and release artifacts.
- Each module has its own version, dependencies, permissions, compatibility, and update lifecycle.

## Module manifest

Every module should publish a manifest containing at least:

- stable module ID and display name;
- semantic version and compatible host API range;
- description, category, icon, and release notes;
- supported OS and CPU architectures;
- supported desktop sessions/capabilities (e.g. X11, Wayland, PipeWire, DBus);
- required and optional dependencies;
- package download size and installed size;
- cryptographic digest and publisher signature metadata;
- requested host capabilities/permissions;
- lifecycle entry points and declared resources;
- minimum free disk space and migration requirements.

Manifests must be schema-validated. Unknown or excessive permissions should fail closed.

## Catalog and distribution

1. The host fetches a versioned catalog over HTTPS.
2. Catalog metadata is signed by the release publisher.
3. The host filters modules by OS, architecture, desktop session, host API version, and dependencies.
4. The user sees download size, installed size, permissions, compatibility, and release notes before installation.
5. The host downloads the selected package to a staging directory.
6. It verifies the publisher signature and digest against trusted metadata.
7. It validates package contents and manifest before activation.
8. It installs atomically and records the installed version.
9. Failed installation restores the previous working version or leaves the module inactive.
10. Updates are explicit or follow a user-configured policy; rollback remains available.

Never load executable code directly from an untrusted URL or execute arbitrary install scripts supplied by catalog metadata. Prefer declarative installation and signed, immutable artifacts.

## Module lifecycle

The panel should support:
- browse/search/filter by category and platform;
- view feature descriptions, compatibility, permissions, and storage footprint;
- install, cancel, retry, repair, update, disable, enable, and uninstall;
- show installed, update available, incompatible, failed, and pending restart states;
- retain user settings only when the user chooses to keep them after uninstall;
- safely handle module removal while a module window or process is active.

Module installation and update operations should use locks to prevent concurrent changes to the same module.

## Runtime isolation and permissions

- Do not give module renderers direct Node.js access.
- Use Electron context isolation, sandboxing where compatible, and a narrow preload/IPC API.
- Validate every IPC sender and payload.
- Grant capabilities per module, not globally.
- Separate module windows, storage, logs, and settings by module ID.
- Do not allow modules to read another module's private data by default.
- Require explicit user confirmation for high-impact capabilities such as global input automation, screen capture, microphone, remote control, filesystem access, or system configuration.
- Do not treat a module signature as proof that its requested permissions are safe.

## Dependency and storage management

- Share common dependencies only when ABI/API compatibility and lifecycle are clear.
- Avoid downloading duplicate runtimes for modules that can safely use the host runtime.
- Show both download and installed size.
- Remove orphaned dependencies only after checking that no installed module requires them.
- Keep user data separate from executable package directories.
- Support disk-space checks and clean cancellation before replacing active files.

## Linux compatibility

Module manifests should declare:
- distribution/package requirements where unavoidable;
- X11 and/or Wayland support;
- PipeWire and portal requirements for screen/audio capture;
- DBus and desktop service requirements;
- permissions and external binaries;
- known compositor limitations.

Do not claim universal Linux support based only on successful packaging. A module must be tested against representative desktop environments and documented per capability.

## Security and supply chain

- Use a trusted signing key and a documented key-rotation/revocation process.
- Verify signatures and hashes before installation and before update activation.
- Pin dependencies and scan module artifacts in CI.
- Publish provenance and release checksums.
- Protect catalog publishing credentials.
- Reject downgrade attacks unless an explicit rollback operation is authorized.
- Maintain an audit log of module lifecycle operations without collecting user content.
- Do not allow a compromised catalog to replace the trust root or execute arbitrary shell commands.

## Suggested implementation phases

1. Extract stable module contracts and identify host-owned shared services.
2. Introduce local manifests and an installed-module registry without changing current behavior.
3. Move one low-risk utility into a separately built module package as a vertical slice.
4. Build catalog UI, compatibility checks, verified download, staging, and rollback.
5. Migrate additional modules incrementally.
6. Remove optional module code and heavy dependencies from the base installer.
7. Add signed releases, update management, Linux capability detection, and integration tests.

Do not attempt a bulk rewrite of all modules. Prove the lifecycle with one small module first.
