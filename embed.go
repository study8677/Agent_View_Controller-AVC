package main

import (
	_ "embed"
	"strings"
)

//go:embed ui/index.html
var indexHTML string

//go:embed ui/styles.css
var stylesCSS string

//go:embed ui/app.js
var appJS string

//go:embed ui/views/plan.js
var planJS string

// htmlContent is the final inlined HTML served to the WebView.
// We assemble it once at startup: the source HTML uses three placeholder
// comments (/*__STYLES__*/, /*__APP_JS__*/, /*__VIEWS_JS__*/) that the
// runtime fills in with the embedded CSS and JS contents. The split keeps
// the dev experience modular while still shipping a single self-contained
// document — no file:// or http server needed.
var htmlContent string

func init() {
	// To add a new view: drop it under ui/views/, embed it here, and
	// concatenate it into viewsJS below. The view file must end with
	// registerView('name', renderFn).
	viewsJS := planJS

	htmlContent = strings.NewReplacer(
		"/*__STYLES__*/", stylesCSS,
		"/*__APP_JS__*/", appJS,
		"/*__VIEWS_JS__*/", viewsJS,
	).Replace(indexHTML)
}
