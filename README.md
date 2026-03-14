<p align="center">
  <h1 align="center">👁️ AVC — Agent View Controller</h1>
  <p align="center">
    <strong>The Visual Dimension Elevator in Unix Pipes</strong><br/>
    <em>Agent outputs JSON in → Human's visual decision JSON out</em>
  </p>
  <p align="center">
    <a href="./README_CN.md">中文</a> · English
  </p>
</p>

---

## The Problem

AI Agents (Codex CLI, Claude Code, Cursor, Gemini CLI...) are **blazing fast** in the terminal. They read code, generate plans, and execute commands at machine speed.

But when they need **human approval** — a refactoring plan, an architecture change, a multi-step deployment — they dump walls of text into the terminal. Humans are forced to read 50+ lines of monospace text, mentally parse the structure, and type "yes" or "no."

**This is insane.** Humans are visual creatures. Our brains process images 60,000× faster than text.

## The Solution

AVC is a **3MB single binary** that does one thing perfectly:

```bash
echo '{"view":"plan","data":{...}}' | avc
```

1. Reads JSON from `stdin`
2. Pops up a native WebView window with a beautiful interactive UI
3. Human drags, edits, reorders — making decisions visually
4. Outputs modified JSON to `stdout`
5. Window closes. Agent continues.

**Like `fzf` gave CLI users interactive selection, AVC gives all CLI agents visual interaction.**

```
Traditional pipe:   agent | grep | jq | awk       (text processing)
AVC pipe:           agent | avc                    (visual processing)
```

## Quick Start

### Install

```bash
# Build from source
git clone https://github.com/study8677/Agent_View_Controller-AVC.git
cd Agent_View_Controller-AVC
go build -o avc .

# Optional: add to PATH
sudo cp avc /usr/local/bin/
```

### Try It

```bash
cat examples/execution-plan.json | ./avc
```

A native window pops up. Drag steps to reorder, edit text, skip steps, then click **✅ Confirm** — the modified JSON appears in your terminal.

## Supported Views

| View Type | Description | Interaction | Status |
|-----------|-------------|-------------|--------|
| `plan` | Execution plans / step lists | Drag to reorder, edit, skip, add/delete | ✅ Ready |
| `graph` | Architecture topology | Drag nodes, edit connections | 🚧 Coming |
| `diff` | Code diff review | Accept/reject per line | 🚧 Planned |
| `table` | Data tables | Edit cells, sort columns | 🚧 Planned |

## JSON Schema

```json
{
  "view": "plan",
  "title": "Microservice Refactor Plan",
  "editable": true,
  "data": {
    "steps": [
      { "id": 1, "label": "Extract UserService", "status": "pending" },
      { "id": 2, "label": "Create API Gateway", "status": "pending" },
      { "id": 3, "label": "Configure service discovery", "status": "pending" }
    ]
  },
  "actions": ["confirm", "cancel"]
}
```

## Using AVC with AI Agents

AVC is **agent-agnostic** — it works with any AI coding agent that can execute shell commands.

### With OpenAI Codex CLI

Add to your project's `AGENTS.md`:

```markdown
## Visual Decision Tool

When you generate a complex execution plan (>3 steps), architecture change,
or multi-file refactoring plan, output it as AVC-compatible JSON and pipe
it through `avc` for human visual review:

    echo '{"view":"plan","title":"...","data":{"steps":[...]}}' | avc

The command blocks until the human confirms. Capture stdout to get the
human-modified plan, then execute accordingly.
```

Then Codex will automatically use AVC when it generates complex plans:

```bash
# Codex generates a plan → pipes to AVC → waits for human → continues
echo '{"view":"plan","title":"Refactor Auth Module","data":{"steps":[
  {"id":1,"label":"Extract auth middleware","status":"pending"},
  {"id":2,"label":"Create JWT service","status":"pending"},
  {"id":3,"label":"Update route handlers","status":"pending"},
  {"id":4,"label":"Add integration tests","status":"pending"}
]}}' | avc
```

### With Claude Code

In your project's `CLAUDE.md` or system prompt:

```markdown
## AVC Integration

For complex execution plans, use the `avc` visual tool instead of
printing plain text. Construct a JSON object with view type and data,
then pipe it through `avc`:

    echo '<json>' | avc

This opens a visual UI for the human to review and modify the plan.
The modified JSON is returned via stdout. Wait for it before proceeding.
```

### With Cursor (AI IDE)

In Cursor's terminal, AVC works as a standard Unix pipe tool. Configure via `.cursorrules`:

```markdown
## Visual Planning

When generating multi-step plans, use `avc` for visual human review:
1. Construct plan as JSON with view:"plan" schema
2. Run: echo '<json>' | avc
3. Read stdout for the human-approved plan
4. Execute the approved steps
```

### With Any Agent

The pattern is universal — **any** tool that can:
1. Write JSON to a process's stdin
2. Read the process's stdout
3. Wait for the process to exit

...can use AVC. It's just a Unix pipe.

## Design Philosophy

| Principle | Description |
|-----------|-------------|
| **Agent is CPU, AVC is Display** | Agents do the thinking. AVC does the showing. |
| **Agent-agnostic** | Works with Codex, Claude, Gemini, Cursor, or any CLI tool |
| **Unix Philosophy** | stdin in, stdout out. Compose with any pipe |
| **Zero Dependencies** | Single binary. Uses system-native WebView |
| **< 100ms Startup** | Native binary, no Node.js / npm overhead |

## Tech Stack

- **Go** + [webview/webview_go](https://github.com/webview/webview_go) — system-native WebView bindings
- **Vanilla JS** — embedded via `go:embed`, zero frontend dependencies
- **macOS**: WKWebView · **Linux**: WebKitGTK · **Windows**: WebView2

## Architecture

```
        ┌──────────┐     stdin      ┌──────────┐     render     ┌──────────┐
        │ AI Agent │ ──── JSON ───→ │   AVC    │ ────────────→  │ WebView  │
        │ (Codex,  │                │ (3MB Go  │                │ (Native  │
        │  Claude, │ ←── JSON ────  │  Binary) │ ←── confirm ─  │  Window) │
        │  Cursor) │     stdout     └──────────┘     callback   └──────────┘
        └──────────┘                                              ↕ Human
```

## Roadmap

AVC's vision is to become the **universal visual layer** for all CLI agents. Every type of structured data an agent produces should have a beautiful, interactive view.

### Phase 1 — Foundations ✅

| View | What Agent Outputs | What Human Sees | Status |
|------|--------------------|-----------------|--------|
| `plan` | Steps with order & status | Draggable step list with edit/skip/delete | ✅ Done |

### Phase 2 — Core Views 🚧

| View | What Agent Outputs | What Human Sees |
|------|--------------------|------------------|
| `graph` | Nodes + edges (services, modules) | Interactive topology — drag nodes, edit labels, add/remove connections |
| `diff` | File paths + hunks | Side-by-side diff with per-line Accept / Reject / Edit |
| `table` | Rows + columns | Sortable, filterable, editable data grid |

### Phase 3 — Rich Visual Content 🔮

| View | What Agent Outputs | What Human Sees |
|------|--------------------|------------------|
| `tree` | File/directory structure | Interactive file tree — rename, move, create, delete |
| `timeline` | Events with timestamps | Gantt-chart-style timeline — drag to adjust scheduling |
| `kanban` | Cards with columns | Kanban board — drag cards between columns |
| `form` | Fields + validation rules | Multi-step wizard form — fill in configs, select options |
| `mindmap` | Hierarchical ideas | Expandable mind map — restructure by dragging branches |

### Phase 4 — Advanced Visualization 🌟

| View | What Agent Outputs | What Human Sees |
|------|--------------------|------------------|
| `metrics` | Numbers + time series | Live dashboard with charts and gauges |
| `flow` | Pipeline stages + conditions | CI/CD flow diagram — reorder stages, toggle gates |
| `compare` | Multiple options with pros/cons | Side-by-side comparison cards — vote & rank |
| `3d-graph` | Complex dependency graphs | 3D force-directed graph — rotate, zoom, filter |

> **The goal**: Any structured JSON → one `| avc` → instant visual interaction. No more reading walls of terminal text.

## Contributing

Contributions welcome! We especially need help with:

- **New view types** — Pick any from the roadmap above and implement it
- **UI polish** — Animations, themes, accessibility
- **Platform testing** — Linux (WebKitGTK) and Windows (WebView2)
- **Agent integration examples** — Show how AVC works with different agents

## License

Apache 2.0
