# WI-BTK Roadmap

This roadmap separates existing functionality from planned architecture. Items are not complete until implemented and validated.

## Phase 0 — Product and platform foundation
- [x] Establish WI-BTK as the suite name and WI-Rec as the capture module name in product documentation.
- [x] Document Windows/Linux support expectations and current limitations.
- [ ] Audit every module's implementation status, dependencies, platform APIs, and permissions.
- [ ] Define the stable host-to-module API and module manifest schema.

## Phase 1 — Module registry
- [ ] Add a local registry of installed modules and versions.
- [ ] Separate enabled/disabled state from installed/uninstalled state.
- [ ] Add module capability and compatibility declarations.
- [ ] Preserve existing user settings and module data during migration.

## Phase 2 — First downloadable module
- [ ] Select one low-risk module as the first independently packaged module.
- [ ] Produce platform-specific artifacts and signed release metadata.
- [ ] Implement verified download, staging, install, activation, rollback, and uninstall.
- [ ] Add integration tests for interrupted downloads and failed updates.

## Phase 3 — Integrated catalog
- [ ] Add catalog panel with search, categories, module detail pages, and storage sizes.
- [ ] Show OS/architecture/desktop compatibility and requested permissions.
- [ ] Add install, cancel, retry, update, repair, disable, and uninstall flows.
- [ ] Add release notes and update notifications.

## Phase 4 — Lightweight base installer
- [ ] Move optional module code and heavy dependencies out of the host package.
- [ ] Keep only the shell, shared APIs, catalog, and essential services in the core.
- [ ] Measure initial installer size and startup/memory impact.
- [ ] Ensure offline operation for already installed modules.

## Phase 5 — Cross-platform quality
- [ ] Validate representative Windows versions and Linux distributions.
- [ ] Test X11 and Wayland paths separately.
- [ ] Add per-module CI and platform compatibility checks.
- [ ] Document unsupported capabilities and graceful fallbacks.

## Release gates

- Signed and verified module artifacts.
- No arbitrary remote code execution from catalog metadata.
- Permission-scoped IPC and sender validation.
- Atomic updates and rollback.
- Reproducible module version inventory.
- Verified Windows/Linux release tests.
