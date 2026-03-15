package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"os"

	webview "github.com/webview/webview_go"
)

// AVCInput is the top-level JSON schema for AVC
type AVCInput struct {
	View       string          `json:"view"`
	Title      string          `json:"title"`
	Data       json.RawMessage `json:"data"`
	Editable   bool            `json:"editable"`
	Actions    []string        `json:"actions"`
	TokenCount int             `json:"token_count,omitempty"` // optional: LLM response token count
}

// CLI flags
var (
	threshold   = flag.Int("threshold", 3000, "Token threshold to trigger WebView (default 3000)")
	noThreshold = flag.Bool("no-threshold", false, "Always show WebView regardless of token count")
)

// Average bytes per token estimate (conservative for mixed CJK/Latin text)
const bytesPerToken = 3

func main() {
	flag.Parse()

	// ① Read JSON from stdin
	inputBytes, err := io.ReadAll(os.Stdin)
	if err != nil {
		fmt.Fprintf(os.Stderr, "avc: failed to read stdin: %v\n", err)
		os.Exit(1)
	}

	if len(inputBytes) == 0 {
		fmt.Fprintf(os.Stderr, "avc: no input provided. Usage: echo '{\"view\":\"plan\",...}' | avc\n")
		os.Exit(1)
	}

	// ② Validate JSON structure
	var input AVCInput
	if err := json.Unmarshal(inputBytes, &input); err != nil {
		fmt.Fprintf(os.Stderr, "avc: invalid JSON input: %v\n", err)
		os.Exit(1)
	}

	if input.View == "" {
		fmt.Fprintf(os.Stderr, "avc: missing required field 'view'\n")
		os.Exit(1)
	}

	// ②.5 Token threshold check — pass-through if below threshold
	if !*noThreshold && *threshold > 0 {
		tokenCount := input.TokenCount
		if tokenCount == 0 {
			// Fallback: estimate token count from byte length
			tokenCount = len(inputBytes) / bytesPerToken
		}
		if tokenCount <= *threshold {
			fmt.Fprintf(os.Stderr, "avc: token count (%d) ≤ threshold (%d), passing through\n", tokenCount, *threshold)
			fmt.Print(string(inputBytes))
			os.Exit(0)
		}
	}

	title := input.Title
	if title == "" {
		title = "AVC - " + input.View
	}

	// ③ Create webview
	w := webview.New(true)
	defer w.Destroy()

	w.SetTitle("AVC · " + title)
	w.SetSize(1100, 750, webview.HintNone)

	// ④ Bind Go functions to JS
	// JS calls window.getInputData() to get the original JSON
	w.Bind("getInputData", func() string {
		return string(inputBytes)
	})

	// JS calls window.confirmResult(jsonStr) when user clicks confirm
	resultChan := make(chan string, 1)
	w.Bind("confirmResult", func(result string) {
		resultChan <- result
		w.Terminate()
	})

	// JS calls window.cancelAction() when user clicks cancel
	w.Bind("cancelAction", func() {
		resultChan <- "" // empty = cancelled
		w.Terminate()
	})

	// ⑤ Load embedded HTML directly
	w.SetHtml(htmlContent)

	// ⑥ Run webview (blocks until window closes)
	w.Run()

	// ⑦ Output result to stdout
	select {
	case result := <-resultChan:
		if result != "" {
			fmt.Println(result)
		} else {
			os.Exit(130) // cancelled
		}
	default:
		os.Exit(130) // window closed without confirming
	}
}

