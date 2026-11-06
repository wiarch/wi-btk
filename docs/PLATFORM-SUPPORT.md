# WI-BTK Platform Support

## Support policy

WI-BTK targets Windows 10/11 x64 and Linux x64. Host packaging and module compatibility are separate concerns: a Linux installer does not prove that every module works on Linux.

## Windows

- Electron desktop host.
- Current packaging includes Windows x64 portable and ZIP targets.
- Several system-control operations use Windows APIs and PowerShell. These must remain platform-gated.
- WI-Booster's advanced boot limits, power plans, and display-frequency controls are currently Windows-specific in the inspected implementation.

## Linux

- The package configuration defines Debian package and AppImage targets.
- A separate build script invokes electron-builder's pacman target.
- Electron enables the WebRTC PipeWire capturer feature on Linux.
- Screen capture and recording depend on compositor/session capabilities, portals, PipeWire, permissions, and installed system utilities.
- X11 and Wayland behavior may differ. Startup logging already notes possible Wayland z-order limitations.
- Do not claim that all Linux distributions or desktop environments are supported without testing.

## Module compatibility matrix (initial assessment)

| Module / area | Windows | Linux | Notes |
| --- | --- | --- | --- |
| WI-BTK host | Target | Target | Packaging exists for Windows and Linux; validate current release artifacts on each OS |
| WI-Rec capture/recording | Supported paths exist | Supported paths exist with caveats | Test X11, Wayland, PipeWire, portals, audio, hotkeys, and multiple monitors |
| WI-Booster advanced controls | Supported | Limited / unsupported | Current advanced system operations use Windows APIs and PowerShell |
| Other utility modules | Per-module validation required | Per-module validation required | Do not infer support from the host platform |

This is a preliminary source review, not a QA certification.

## Release validation

For each supported OS and module:
- build on the target OS;
- install and uninstall the host package;
- test launch, tray, shutdown, autostart, settings, and update behavior;
- test required native permissions and dependencies;
- test module install/update/rollback/uninstall;
- test display scaling, multi-monitor, audio devices, and hotkeys where relevant;
- document tested distributions, desktop environments, and known limitations.

## Compatibility reporting

The module catalog must display separate states for:
- supported and tested;
- supported but not fully tested;
- experimental;
- unsupported;
- blocked by a missing dependency or permission.

Never silently show an unsupported action as available.
