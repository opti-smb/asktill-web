# Asktill Channel Partners

Policybazaar-style partner marketplace UI for Asktill (loans → product details → bank list → bank website).

## Develop standalone

```bash
npm install
npm run dev
```

Opens at http://127.0.0.1:5180

## Embed in asktill-web

Exported as `@asktill/channel-partners`. The dashboard **Channel partners** tab mounts `ChannelPartnersApp` under `/dashboard/channel-partners/*`.
