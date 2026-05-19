package main

import (
	"bytes"
	_ "embed"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"

	webview "github.com/webview/webview_go"
)

// version is injected at build time via:
//
//	go build -ldflags "-X main.version=v0.2.0"
var version = "dev"

// skillMarkdown is the SKILL.md text bundled into the binary so that
// `avc install-skill` works without needing the source tree on disk.
//
//go:embed skills/avc/SKILL.md
var skillMarkdown string

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
	quiet       = flag.Bool("quiet", false, "Suppress informational stderr messages (errors still go to stderr)")
	quietShort  = flag.Bool("q", false, "Shorthand for --quiet")
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

// dispatchSubcommand inspects the argv slice (sans program name) and, if it
// matches a known subcommand, returns handled=true plus the exit code the
// process should use. Pure for easy testing — does no I/O of its own; the
// actual subcommand handlers (install-skill, etc.) live in helpers that this
// function calls.
//
// Today the only subcommand is "install-skill". Everything else (or empty
// args) falls through so main() can run flag.Parse() and the stdin pipeline.
func dispatchSubcommand(args []string) (handled bool, exitCode int) {
	if len(args) == 0 {
		return false, 0
	}
	switch args[0] {
	case "install-skill":
		return true, runInstallSkill(args[1:])
	default:
		return false, 0
	}
}

func main() {
	// Subcommand dispatch BEFORE flag.Parse so unknown subcommand names
	// don't trip the flag parser. If a subcommand is matched, it owns its
	// own argv parsing and we exit with its result.
	if handled, code := dispatchSubcommand(os.Args[1:]); handled {
		os.Exit(code)
	}

	flag.Usage = func() {
		fmt.Fprintf(os.Stderr, "avc %s — Agent View Controller\n", version)
		fmt.Fprintln(os.Stderr, "Pipe JSON to avc to open an interactive WebView for human review.")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "Usage:  echo '<json>' | avc [flags]")
		fmt.Fprintln(os.Stderr, "        avc install-skill [agent...]   # install SKILL.md for one or more agents")
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

	// Either form (--quiet / -q) flips the same effective bit.
	isQuiet := *quiet || *quietShort

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
		if !isQuiet {
			fmt.Fprintf(os.Stderr, "avc: token count (%d) ≤ threshold (%d), passing through\n", dec.TokenCount, *threshold)
		}
		fmt.Print(string(inputBytes))
		os.Exit(0)
	}

	runWebView(dec.Input, inputBytes)
}

// muteStderr redirects Go's os.Stderr to /dev/null and returns a restore
// function. We use this around webview.New(...) to silence the macOS
// WebView's framework noise — lines like
// `TSM AdjustCapsLockLEDForKeyTransitionHandling ...` or `error messaging
// the mach port for IMKCFRunLoopWakeUpReliable` that otherwise pollute
// pipelines like `... | avc | jq`.
//
// Default-on for the WebView window only. AVC's own informational and
// error writes happen BEFORE runWebView is called, so they're unaffected.
// The returned restore function is deferred by the caller so the post-
// webview os.Exit(130) path still reaches the real terminal. If you need
// to debug native WebView issues, comment out the muteStderr call in
// runWebView. (A future --debug flag could toggle this.)
//
// Caveat — Go-level only: this swap catches everything that goes through
// Go's os.Stderr (and stdlib helpers like log.Print). Some macOS noise
// originates from Objective-C / libc writing directly to file descriptor
// 2 (NSLog → asl), which a Go-level swap alone won't catch. Doing the
// FD-level swap correctly cross-platform requires syscall.Dup / Dup2 on
// Unix and SetStdHandle on Windows — those naturally live in build-
// tagged files (mute_unix.go, mute_windows.go). The first pass keeps
// everything in main.go per scope; a follow-up can split the platform
// shims out when the file-touch scope opens up.
//
// Best-effort: if the /dev/null open fails (exotic sandbox), we return a
// no-op restore so callers can always defer cleanly.
func muteStderr() (restore func()) {
	devnull, err := os.OpenFile(os.DevNull, os.O_WRONLY, 0)
	if err != nil {
		return func() {}
	}
	origStderr := os.Stderr
	os.Stderr = devnull
	return func() {
		os.Stderr = origStderr
		_ = devnull.Close()
	}
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

	// Mute stderr only for the WebView lifetime. Default-on because the
	// macOS framework noise (TSM/IMK warnings) is pure pipeline pollution —
	// not actionable, not ours, and easily breaks `... | avc | jq`. If you
	// need to debug native WebView issues, comment this block out.
	restoreStderr := muteStderr()
	defer restoreStderr()

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

// ─── install-skill subcommand ───────────────────────────────────────────────

// skillTarget describes one place we can install SKILL.md to.
type skillTarget struct {
	Key   string // "claude", "codex", "gemini", "copilot" — what users type
	Label string // pretty label for stdout
	Dir   string // absolute install dir (~/.claude/skills/avc/, etc.)
}

// allSkillTargets enumerates every agent AVC knows about, in the order we'd
// auto-detect. Centralizing this here keeps install.sh and the Go installer
// in lockstep.
func allSkillTargets(home string) []skillTarget {
	return []skillTarget{
		{Key: "codex", Label: "Codex CLI", Dir: filepath.Join(home, ".codex", "skills", "avc")},
		{Key: "claude", Label: "Claude Code", Dir: filepath.Join(home, ".claude", "skills", "avc")},
		{Key: "gemini", Label: "Gemini CLI", Dir: filepath.Join(home, ".gemini", "skills", "avc")},
		{Key: "copilot", Label: "GitHub Copilot", Dir: filepath.Join(home, ".copilot", "skills", "avc")},
	}
}

// resolveSkillTargets is the pure planning step: given the user's args, the
// home dir, and a function that reports whether a given config dir exists,
// returns the list of targets we should install to.
//
// Rules:
//   - With explicit args, install to exactly those (unknown keys → error).
//   - Without args, install to every target whose ~/.<agent> directory exists.
//   - If no args AND no detection match → returns (nil, nil) so the caller
//     can decide what to do (we print a help message and exit 1).
func resolveSkillTargets(args []string, home string, exists func(string) bool) ([]skillTarget, error) {
	all := allSkillTargets(home)
	byKey := make(map[string]skillTarget, len(all))
	for _, t := range all {
		byKey[t.Key] = t
	}

	if len(args) > 0 {
		var picked []skillTarget
		var unknown []string
		for _, a := range args {
			a = strings.ToLower(strings.TrimSpace(a))
			if a == "" {
				continue
			}
			if t, ok := byKey[a]; ok {
				picked = append(picked, t)
			} else {
				unknown = append(unknown, a)
			}
		}
		if len(unknown) > 0 {
			known := make([]string, 0, len(all))
			for _, t := range all {
				known = append(known, t.Key)
			}
			return nil, fmt.Errorf("unknown agent(s): %s (known: %s)",
				strings.Join(unknown, ", "), strings.Join(known, ", "))
		}
		return picked, nil
	}

	// Auto-detect by config dir presence (parent of <key>/skills/avc).
	var picked []skillTarget
	for _, t := range all {
		// t.Dir is "<home>/.<key>/skills/avc"; the agent config dir is "<home>/.<key>".
		// Walk up two dirs.
		agentRoot := filepath.Dir(filepath.Dir(t.Dir))
		if exists(agentRoot) {
			picked = append(picked, t)
		}
	}
	return picked, nil
}

// runInstallSkill is the install-skill subcommand entrypoint. Returns the
// process exit code.
func runInstallSkill(args []string) int {
	// Sub-flag set so `avc install-skill --help` is sensible. We also
	// honor --quiet/-q here so scripts can install silently.
	fs := flag.NewFlagSet("install-skill", flag.ContinueOnError)
	quietSub := fs.Bool("quiet", false, "Suppress per-install stdout lines")
	quietSubShort := fs.Bool("q", false, "Shorthand for --quiet")
	fs.Usage = func() {
		fmt.Fprintln(os.Stderr, "avc install-skill — copy SKILL.md to one or more agent skill dirs")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "Usage:")
		fmt.Fprintln(os.Stderr, "  avc install-skill                # auto-detect (~/.codex, ~/.claude, ~/.gemini, ~/.copilot)")
		fmt.Fprintln(os.Stderr, "  avc install-skill claude codex   # explicit list")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "Known agents: codex, claude, gemini, copilot")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "Flags:")
		fs.PrintDefaults()
	}
	if err := fs.Parse(args); err != nil {
		// flag.ContinueOnError already prints the error; bail with 2.
		return 2
	}

	home, err := os.UserHomeDir()
	if err != nil {
		fmt.Fprintf(os.Stderr, "avc: cannot resolve home directory: %v\n", err)
		return 1
	}

	targets, err := resolveSkillTargets(fs.Args(), home, func(p string) bool {
		st, err := os.Stat(p)
		return err == nil && st.IsDir()
	})
	if err != nil {
		fmt.Fprintf(os.Stderr, "avc: %v\n", err)
		return 1
	}

	if len(targets) == 0 {
		fmt.Fprintln(os.Stderr, "avc: no agent config dir detected (~/.codex, ~/.claude, ~/.gemini, ~/.copilot)")
		fmt.Fprintln(os.Stderr, "  Pass an explicit list, e.g.: avc install-skill claude codex")
		return 1
	}

	isQuiet := *quietSub || *quietSubShort
	failures := 0
	for _, t := range targets {
		if err := writeSkill(t.Dir, skillMarkdown); err != nil {
			fmt.Fprintf(os.Stderr, "avc: failed to install %s → %s: %v\n", t.Label, t.Dir, err)
			failures++
			continue
		}
		if !isQuiet {
			fmt.Printf("✓ %s → %s\n", t.Label, prettyPath(t.Dir, home))
		}
	}
	if failures > 0 {
		return 1
	}
	return 0
}

// writeSkill creates dir (if needed) and writes SKILL.md atomically-ish.
func writeSkill(dir, contents string) error {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(dir, "SKILL.md"), []byte(contents), 0o644)
}

// prettyPath swaps the user's home prefix for "~" so install lines look
// like "~/.claude/skills/avc/" instead of dumping the full absolute path.
func prettyPath(p, home string) string {
	if home != "" && strings.HasPrefix(p, home) {
		return "~" + strings.TrimPrefix(p, home)
	}
	return p
}
