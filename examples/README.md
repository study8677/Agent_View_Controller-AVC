# AVC Examples

Pipe any of these to `avc` to see the WebView in action:

```bash
cat examples/code-refactor.json | avc
```

| File | Scenario | Language |
|------|----------|----------|
| `execution-plan.json` | 7-step microservice refactor (split UserService, API Gateway, K8s) | zh |
| `code-refactor.json` | Migrate session-based auth to JWT with refresh tokens | en |
| `ci-cd-pipeline.json` | Set up GitHub Actions CI/CD for a Node.js project | en |
| `incident-response.json` | Investigate and recover from a production PostgreSQL outage | zh |
| `kubernetes-deploy.json` | Deploy a stateless service to Kubernetes with HPA and probes | ja |
| `data-migration.json` | Migrate user data from PostgreSQL to MongoDB Atlas | fr |
| `code-review-checklist.json` | Pre-merge review checklist for a feature PR | en |

Each file matches the AVC plan schema: `view`, `title`, `lang`, `editable`, `token_count`, `data.steps[]`, and `actions[]`. The `token_count` value triggers the WebView popup automatically (no `--no-threshold` flag needed).
