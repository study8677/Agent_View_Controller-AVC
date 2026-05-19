package main

import (
	_ "embed"
	"strings"
)

//go:embed ui/index.html
var indexHTML string

//go:embed ui/styles.css
var stylesCSS string

//go:embed ui/views/graph.css
var graphCSS string

//go:embed ui/app.js
var appJS string

//go:embed ui/views/plan.js
var planJS string

//go:embed ui/views/graph.js
var graphJS string

// htmlContent is the final inlined HTML served to the WebView.
// We assemble it once at startup: the source HTML uses three placeholder
// comments (/*__STYLES__*/, /*__APP_JS__*/, /*__VIEWS_JS__*/) that the
// runtime fills in with the embedded CSS and JS contents. The split keeps
// the dev experience modular while still shipping a single self-contained
// document — no file:// or http server needed.
var htmlContent string

func init() {
	// To add a new view: drop ui/views/<name>.js (+ optional .css), embed
	// them here, and concatenate into viewsJS / cssContent below. The view
	// file must end with registerView('name', renderFn) and may also call
	// registerKeyHandler / registerInfoUpdater.
	cssContent := stylesCSS + "\n\n" + graphCSS
	viewsJS := planJS + "\n\n" + graphJS

	htmlContent = strings.NewReplacer(
		"/*__STYLES__*/", cssContent,
		"/*__APP_JS__*/", appJS,
		"/*__VIEWS_JS__*/", viewsJS,
	).Replace(indexHTML)
}
