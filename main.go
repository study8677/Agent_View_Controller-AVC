package main

import (
	"encoding/json"
	"fmt"
	"io"
	"os"

	webview "github.com/webview/webview_go"
)

// AVCInput is the top-level JSON schema for AVC
type AVCInput struct {
	View     string          `json:"view"`
	Title    string          `json:"title"`
	Data     json.RawMessage `json:"data"`
	Editable bool            `json:"editable"`
	Actions  []string        `json:"actions"`
}

func main() {
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

