---
name: avc
description: Use AVC (Agent View Controller) to present complex execution plans, architecture changes, and multi-step operations as interactive visual UIs. Instead of dumping walls of text, pipe structured JSON to `avc` for human visual review and confirmation. The human can drag-to-reorder, edit, skip, delete, and add steps before confirming.
---

# AVC — Agent View Controller

AVC is a visual interaction tool that transforms JSON into interactive native WebView UIs.
Use it when you need human approval for complex decisions.

## When to Use

Use `avc` instead of printing plain text when:

- **Execution plans** with more than 3 steps
- **Architecture changes** involving multiple modules
- **Multi-file refactoring** plans
- **Deployment sequences** that need human review
- **Any complex plan** where the human should visually review and reorder steps

## Prerequisites

`avc` must be installed and available in PATH:

```bash
# From source
git clone https://github.com/study8677/Agent_View_Controller-AVC.git
cd Agent_View_Controller-AVC && go build -o avc . && sudo cp avc /usr/local/bin/
```

## How to Use

### Step 1: Construct JSON

Build a JSON object with `view` type and structured data:

```json
{
  "view": "plan",
  "title": "Your Plan Title",
  "lang": "en",
  "editable": true,
  "token_count": 4500,
  "data": {
    "steps": [
      {"id": 1, "label": "Step description", "status": "pending"},
      {"id": 2, "label": "Another step", "status": "pending"}
    ]
  }
}
```

> **Tip — `lang` field:** Set `"lang": "zh"` to render the UI buttons and
> status bar in Chinese (default: `"en"`). Match this to the language of
> the step labels so the human reviewer sees a consistent UI.

### Step 2: Pipe to AVC

```bash
echo '<json>' | avc
```

### Step 3: Read the Result

- Exit code `0` = human confirmed → stdout contains modified JSON
- Exit code `130` = human cancelled

```bash
RESULT=$(echo '{"view":"plan","title":"My Plan","token_count":5000,"data":{"steps":[{"id":1,"label":"Step 1","status":"pending"}]}}' | avc)

if [ $? -eq 0 ]; then
  # Parse $RESULT — human may have reordered, edited, or removed steps
  echo "$RESULT"
else
  echo "Human cancelled"
fi
```

## Important Behavior

1. `avc` **blocks** until the human clicks Confirm or Cancel
2. **stdout** contains the human-modified JSON (may have reordered/edited/removed steps)
3. If `token_count` ≤ 3000 (default threshold), AVC **passes through** without opening a window
4. Use `--no-threshold` to always show the WebView window
5. Use `--threshold=N` to set a custom threshold

## Token Threshold

AVC has a smart filter: short content passes through directly.

- If JSON contains `token_count` field → uses that value
- Otherwise → estimates from byte length (`bytes / 3`)
- If ≤ threshold → pass-through (no window, exit `0`, original JSON on stdout)

**Include `token_count` in your JSON for accurate control.**

## What the Human Can Do

When the human sees your plan in AVC, they can:

- **Drag & drop** to reorder steps
- **Edit** step descriptions by clicking on text
- **Skip** steps they don't want executed
- **Delete** steps entirely
- **Add** new steps

**Always respect the human's modifications in the returned JSON.**

## Supported Views

| view   | Use for                      |
|--------|------------------------------|
| `plan` | Step-by-step execution plans |

## Example: Full Agent Workflow

```bash
# 1. Agent generates a plan as JSON
PLAN='{"view":"plan","title":"Refactor Auth","token_count":5000,"editable":true,"data":{"steps":[
  {"id":1,"label":"Extract auth middleware","status":"pending"},
  {"id":2,"label":"Create JWT service","status":"pending"},
  {"id":3,"label":"Update route handlers","status":"pending"},
  {"id":4,"label":"Add integration tests","status":"pending"}
]}}'

# 2. Pipe to AVC for human review
APPROVED=$(echo "$PLAN" | avc)

# 3. If confirmed, execute only approved steps
if [ $? -eq 0 ]; then
  echo "$APPROVED" | jq -r '.data.steps[] | select(.skipped != true) | .label'
fi
```
