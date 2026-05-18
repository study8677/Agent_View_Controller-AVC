# Changelog

All notable changes to AVC (Agent View Controller) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-05-18

### Added
- UI internationalization across 7 languages — English, 中文, 日本語, 한국어, Español, Français, Deutsch — selected via the new `lang` JSON field; unknown values fall back to English.
- 6 real-world example scenarios under `examples/` covering code refactoring, CI/CD setup, incident response, Kubernetes deploy, data migration, and pre-merge code review, plus an `examples/README.md` index.
- Homebrew tap (`brew install study8677/tap/avc`) as the recommended install path; `brew info avc` prints copy-paste commands to wire the skill into Claude Code / Codex / Gemini.
- Unit test suite — 14 cases covering token estimation, input parsing, threshold logic, language round-trip, and edge cases — runs headless on any platform.
- macOS GitHub Actions CI: `go vet`, `go test`, build with version injection, and two stdin smoke tests on every push/PR to `main`.
- Apache 2.0 `LICENSE` file at repo root (the README already declared the license; the file was missing).
- `--version` flag on the `avc` binary, build-time injectable via `-ldflags "-X main.version=..."`.
- Keyboard shortcuts in the WebView: `Enter` to confirm, `Esc` to cancel, `Cmd/Ctrl+Enter` to confirm even while editing text.
- Form-field-aware editing guard so keyboard shortcuts don't hijack future views that contain native `<input>` / `<textarea>` / `<select>` elements.
- `CONTRIBUTING.md` with a short guide for adding view types, UI languages, README translations, and platform verification.
- Honest "Platform Support" table in the README — macOS verified in CI, Linux/Windows marked unverified and inviting contributors.

### Changed
- Split the 767-line monolithic `ui/index.html` into modular files: `ui/index.html` (skeleton), `ui/styles.css`, `ui/app.js` (i18n + dispatcher + view registry), and `ui/views/plan.js`. New view types now plug in via `registerView(name, renderFn)` instead of editing a single giant file.
- `install.sh` prefers `~/.local/bin` → `~/bin` → `/usr/local/bin` so the common case avoids `sudo`; uses a unique per-install temp dir with trap cleanup; injects the git short hash into the build; verifies `command -v avc` after install.
- Refactored `main.go`: extracted a pure `decide()` function so input/threshold logic is unit-testable without spawning a WebView; introduced sentinel errors (`ErrEmptyInput`, `ErrInvalidJSON`, `ErrMissingView`) for callers to branch on; replaced the naive `bytes/3` token heuristic with an ASCII (÷4) vs multibyte (×2/3) estimate that handles CJK input correctly.
- WebView callback synchronization switched from channel+default to `atomic.Value` + `atomic.Bool` to remove a happens-before ambiguity when the OS dispatches Bind handlers on the UI thread.
- Demoted `curl | bash` from primary to "alternative" install method now that Homebrew is available; tightened the manual-install snippet to skip `sudo` by default.

### Fixed
- `.gitignore` pattern `avc` was matching both the root binary **and** the `skills/avc/` directory, silently excluding `skills/avc/SKILL.md` from the repo. Fresh clones running `install.sh` failed at the skill-copy step. Anchored the pattern to `/avc` so it only matches the top-level binary; committed `skills/avc/SKILL.md` for real.
- Whitespace-only stdin (e.g. `echo '' | avc`) was reported as "invalid JSON" because of the trailing newline; now treated as empty input.
- Mixed-language UI (CN buttons next to EN status bar) replaced by a single i18n dictionary so every string in the chrome respects the active locale.

### Documentation
- Both READMEs gained a flag-emoji language switcher, a "UI Languages" section listing all 7 locales with their Confirm/Cancel/status translations, and a "More examples" callout linking the new `examples/` folder.
- `lang` field documented across both READMEs, `AGENTS.md`, and `skills/avc/SKILL.md` with JSON-schema examples.

## [0.1.0] - 2026-03-15

Initial public release: plan view with drag-to-reorder editing.

[0.3.0]: https://github.com/study8677/Agent_View_Controller-AVC/compare/v0.1.0...v0.3.0
[0.1.0]: https://github.com/study8677/Agent_View_Controller-AVC/releases/tag/v0.1.0
