# AVC Integration Guide for AI Agents

## What is AVC?

AVC (Agent View Controller) is a visual interaction tool installed on this system.
It transforms JSON data into interactive visual UIs for human decision-making.

**Binary location:** `avc` (in PATH) or `./avc` (project root)

## When to Use AVC

Use AVC instead of printing plain text when you need human approval for:

- **Execution plans** with more than 3 steps
- **Architecture changes** involving multiple modules
- **Multi-file refactoring** plans
- **Deployment sequences** that need human ordering

## How to Use

Construct a JSON object following the schema below, then pipe it to `avc`:

```bash
echo '{"view":"plan","title":"Your Plan Title","editable":true,"data":{"steps":[{"id":1,"label":"Step description","status":"pending"}]}}' | avc
```

### Important Behavior

1. The `avc` command **blocks** until the human clicks Confirm or Cancel
2. **stdout** contains the modified JSON (human may have reordered, edited, or removed steps)
3. Exit code `0` = confirmed, exit code `130` = cancelled
4. Parse the returned JSON to get the human-approved plan
5. **Token threshold**: If the input token count ≤ 3000 (default), AVC will **pass-through** — it outputs the original JSON to stdout and exits with code `0` without opening a window. This avoids interrupting the human for short content.

### Token Threshold

AVC has a built-in token threshold (default: 3000 tokens). When the content is short, AVC skips the WebView and passes through directly.

**How it works:**
- If the JSON contains a `token_count` field, AVC uses that value
- Otherwise, AVC estimates tokens from the JSON byte length (`bytes / 3`)
- If the token count ≤ threshold, AVC passes through without opening a window

**To always show the WebView** (bypass threshold), use `--no-threshold`:
```bash
echo '<json>' | avc --no-threshold
```

**To set a custom threshold:**
```bash
echo '<json>' | avc --threshold=5000
```

**To include token count in JSON** (recommended for accuracy):
```json
{
  "view": "plan",
  "title": "Your Plan",
  "token_count": 4500,
  "data": { "steps": [...] }
}
```

### JSON Schema

```json
{
  "view": "plan",
  "title": "Plan title shown in window header",
  "editable": true,
  "token_count": 4500,
  "data": {
    "steps": [
      {
        "id": 1,
        "label": "Human-readable step description",
        "status": "pending"
      }
    ]
  },
  "actions": ["confirm", "cancel"]
}
```

> Note: `token_count` is optional. If omitted, AVC estimates from byte length.

### Supported view types

| view    | Use for                    |
|---------|----------------------------|
| `plan`  | Step-by-step execution plans |

### Example

```bash
RESULT=$(echo '{"view":"plan","title":"Refactor Plan","token_count":5000,"editable":true,"data":{"steps":[
  {"id":1,"label":"Extract auth middleware","status":"pending"},
  {"id":2,"label":"Create JWT service","status":"pending"},
  {"id":3,"label":"Update routes","status":"pending"}
]}}' | avc)

if [ $? -eq 0 ]; then
  echo "Human approved plan: $RESULT"
  # Parse $RESULT and execute approved steps
else
  echo "Human cancelled the plan"
fi
```

## Human Capabilities in AVC

When the human sees your plan in AVC, they can:

- **Drag & drop** to reorder steps
- **Edit** step descriptions by clicking on text
- **Skip** steps they don't want executed
- **Delete** steps entirely
- **Add** new steps you didn't think of

Always respect the human's modifications in the returned JSON.

