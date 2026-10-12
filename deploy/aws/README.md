# AWS web deploy placeholders (scaffold only)

**Vercel stays production** (`npm run deploy:prod` / `vercel.json` untouched).

Enable S3/CloudFront later:

| Variable | Example |
|----------|---------|
| `AWS_DEPLOY_ENABLED` | `true` when ready |
| `AWS_REGION` | `us-east-1` |
| `S3_BUCKET_WEB` | `asktill-web-prod` |
| `CLOUDFRONT_DISTRIBUTION_ID` | `E123...` |

| Secret | Purpose |
|--------|---------|
| `AWS_ROLE_ARN` | OIDC role for Actions |

Until then, this workflow only builds on PR/push (and deploys only if enabled / manual dispatch with secrets).
