package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"sync/atomic"

	webview "github.com/webview/webview_go"
)

// version is injected at build time via:
//
//	go build -ldflags "-X main.version=v0.2.0"
var version = "dev"

// AVCInput is the top-level JSON schema for AVC
type AVCInput struct {
	View       string          `json:"view"`
	Title      string          `json:"title"`
	Lang       string          `json:"lang"` // optional: "en" (default) or "zh"
	Data       json.RawMessage `json:"data"`
	Editable   bool            `json:"editable"`
	Actions    []string        `json:"actions"`
	TokenCount int             `json:"token_count,omitempty"` // optional: LLM response token count
}

// CLI flags
var (
	threshold   = flag.Int("threshold", 3000, "Token threshold to trigger WebView")
	noThreshold = flag.Bool("no-threshold", false, "Always show WebView regardless of token count")
	showVersion = flag.Bool("version", false, "Print version and exit")
)

const (
	exampleHint  = "  See examples/execution-plan.json or run: avc --help"
	schemaHintEN = "AVC expects JSON like: {\"view\":\"plan\",\"title\":\"...\",\"data\":{...}}"
)

// Sentinel errors so callers (and tests) can distinguish failure modes
var (
	ErrEmptyInput  = errors.New("no input provided")
	ErrInvalidJSON = errors.New("invalid JSON input")
	ErrMissingView = errors.New("missing required field 'view'")
)

// Decision represents what to do after parsing input.
type Decision struct {
	PassThrough bool      // true → write Input back to stdout, exit 0
	Input       *AVCInput // parsed input (always set on success)
	TokenCount  int       // resolved token count (from field or estimate)
}

// decide validates the raw JSON and resolves the pass-through vs render decision.
// Pure: no I/O, no os.Exit. Returns an error for any input rejection.
func decide(raw []byte, thresholdN int, noThresh bool) (*Decision, error) {
	// Treat whitespace-only stdin (e.g. `echo ''` gives "\n") as empty.
	if len(bytes.TrimSpace(raw)) == 0 {
		return nil, ErrEmptyInput
	}
	var in AVCInput
	if err := json.Unmarshal(raw, &in); err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidJSON, err)
	}
	if in.View == "" {
		return nil, ErrMissingView
	}

	tc := in.TokenCount
	if tc == 0 {
		tc = estimateTokens(raw)
	}
	pass := false
	if !noThresh && thresholdN > 0 && tc <= thresholdN {
		pass = true
	}
	return &Decision{PassThrough: pass, Input: &in, TokenCount: tc}, nil
}

// estimateTokens returns a rough token count for arbitrary bytes.
// ASCII bytes are ~4 bytes/token; multibyte (CJK) bytes are ~1.5 bytes/token.
// Counted separately and ceiling-divided so tiny inputs round up, not down.
func estimateTokens(b []byte) int {
	asciiBytes := 0
	multiByte := 0
	for _, c := range b {
		if c < 128 {
			asciiBytes++
		} else {
			multiByte++
		}
	}
	// Ceiling division: (n + d - 1) / d
	asciiTokens := (asciiBytes + 3) / 4 // 4 bytes / token
	cjkTokens := (multiByte*2 + 2) / 3  // 3 bytes / 2 tokens
	return asciiTokens + cjkTokens
}

func main() {
	flag.Usage = func() {
		fmt.Fprintf(os.Stderr, "avc %s — Agent View Controller\n", version)
		fmt.Fprintln(os.Stderr, "Pipe JSON to avc to open an interactive WebView for human review.")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "Usage:  echo '<json>' | avc [flags]")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "Flags:")
		flag.PrintDefaults()
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "Exit codes:  0 = confirmed / pass-through, 130 = cancelled, 1 = invalid input")
	}
	flag.Parse()

	if *showVersion {
		fmt.Println(version)
		os.Exit(0)
	}

	inputBytes, err := io.ReadAll(os.Stdin)
	if err != nil {
		fmt.Fprintf(os.Stderr, "avc: failed to read stdin: %v\n", err)
		os.Exit(1)
	}

	dec, err := decide(inputBytes, *threshold, *noThreshold)
	if err != nil {
		switch {
		case errors.Is(err, ErrEmptyInput):
			fmt.Fprintln(os.Stderr, "avc: no input provided.")
			fmt.Fprintln(os.Stderr, "  Usage: echo '{\"view\":\"plan\",...}' | avc")
		case errors.Is(err, ErrInvalidJSON), errors.Is(err, ErrMissingView):
			fmt.Fprintf(os.Stderr, "avc: %v\n", err)
			fmt.Fprintln(os.Stderr, "  "+schemaHintEN)
		}
		fmt.Fprintln(os.Stderr, exampleHint)
		os.Exit(1)
	}

	if dec.PassThrough {
		fmt.Fprintf(os.Stderr, "avc: token count (%d) ≤ threshold (%d), passing through\n", dec.TokenCount, *threshold)
		fmt.Print(string(inputBytes))
		os.Exit(0)
	}

	runWebView(dec.Input, inputBytes)
}

// runWebView opens the native WebView, blocks until the human decides, and
// writes the human-modified JSON to stdout (or exits 130 on cancel).
//
// Synchronization: webview_go invokes Bind callbacks on the OS UI thread.
// We use atomic.Value (rather than a channel) to publish the result, because
// it gives a documented happens-before guarantee across threads regardless of
// how the webview library schedules callbacks. The "no callback fired" case
// (user closed the window via title-bar X) leaves the value as its zero state,
// which we treat as cancellation.
func runWebView(input *AVCInput, inputBytes []byte) {
	title := input.Title
	if title == "" {
		title = input.View
	}

	w := webview.New(true)
	defer w.Destroy()

	w.SetTitle("AVC · " + title)
	w.SetSize(1100, 750, webview.HintNone)

	var (
		result    atomic.Value // string
		confirmed atomic.Bool
	)
	result.Store("")

	w.Bind("getInputData", func() string {
		return string(inputBytes)
	})
	w.Bind("confirmResult", func(r string) {
		result.Store(r)
		confirmed.Store(true)
		w.Terminate()
	})
	w.Bind("cancelAction", func() {
		w.Terminate()
	})

	w.SetHtml(htmlContent)
	w.Run()

	if confirmed.Load() {
		fmt.Println(result.Load().(string))
		return
	}
	os.Exit(130)
}
