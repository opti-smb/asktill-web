# M4 / M6 verification notes (AskTill)

## M4 — Subscription / tier gating

Client paywalls are UX only. Server enforcement on Backend:

- Upload / analyze calls `enforce_upload_tier_gate` → entitlements + `identity.users.tier`
- Free users are limited by calendar-month caps; paid bypasses that gate
- Paid-only *dashboard sections* are still client-gated; privileged APIs must keep checking tier on each request (already true for upload entitlement)

## M6 — CORS

Each service uses explicit `CORS_ORIGINS` (not `*`) with `allow_credentials=True` where cookies matter.

Auth (refresh cookie):
- Must list the exact SPA origin(s)
- Prod: `REFRESH_COOKIE_SECURE=true`, `REFRESH_COOKIE_SAMESITE=none` (cross-site Vercel → Render)
- Local: `REFRESH_COOKIE_SECURE=false`, `REFRESH_COOKIE_SAMESITE=lax` (Vite proxy same-site)
