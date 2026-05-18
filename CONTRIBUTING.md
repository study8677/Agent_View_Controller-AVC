# Contributing to AVC

Thanks for your interest in making AVC better! Here's how to help.

## What we need most

- **New view types** — `graph`, `diff`, `table`, `tree`, `timeline`, `kanban`, `form`, `mindmap`, and more are on the [roadmap](README.md#roadmap). Pick one and ship a prototype.
- **Platform verification** — Linux (WebKitGTK) and Windows (WebView2) builds aren't yet verified in CI. If you successfully run AVC on either, please open an issue (or a PR adding a CI runner) so we can flip the platform from ⚠ to ✅.
- **UI translations** — the WebView UI ships in 7 languages today (`en`, `zh`, `ja`, `ko`, `es`, `fr`, `de`). To add another, extend the `I18N` dictionary at the top of `ui/app.js` and the `htmlLangMap` in `init()`.
- **README translations** — the full README is currently in English and Chinese (`README.md` / `README_CN.md`). Drop a new `README_XX.md` and link it from the language switcher in the existing READMEs.

## Adding a new view type

The codebase is structured to make this easy:

1. Create `ui/views/<your-view>.js`. Define a `render<Name>View()` function and call `registerView('<name>', renderFn)` at the bottom of the file.
2. Add `//go:embed ui/views/<your-view>.js` to `embed.go` and concatenate it into `viewsJS`.
3. Add any view-specific CSS to `ui/styles.css`.
4. Drop an example JSON into `examples/<your-view>.json` and add it to `examples/README.md`.
5. Update the "Supported Views" table in `README.md` and `README_CN.md`.
6. Run `go build -o avc . && cat examples/<your-view>.json | ./avc --no-threshold` to confirm the popup renders.

## Adding a new UI language

1. Extend `I18N` in `ui/app.js` with a new entry; all 15 keys are required.
2. Extend `htmlLangMap` in `init()` so the `<html lang>` attribute is set correctly.
3. Update the language table in both `README.md` and `README_CN.md`.
4. Update the supported-langs note in `skills/avc/SKILL.md` and `AGENTS.md`.

## Development setup

```bash
git clone https://github.com/study8677/Agent_View_Controller-AVC.git
cd Agent_View_Controller-AVC
go build -o avc .
go test ./...
```

The repo runs CI on macOS only today (see `.github/workflows/ci.yml`). Tests should pass on Linux too — they don't touch the WebView. CGO + WebKitGTK on Linux is the unverified part.

## Pull requests

- Keep PRs focused on one change.
- New view types and i18n changes should include a screenshot of the resulting WebView when possible.
- Run `gofmt -l .` and `go vet ./...` — CI will reject mis-formatted Go.

## License

By contributing, you agree your contributions are licensed under [Apache 2.0](LICENSE).
