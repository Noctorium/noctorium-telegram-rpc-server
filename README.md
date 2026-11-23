# Noctorium for Telegram

Shows the song a Noctorium user is playing in their **Telegram bio** — "🎵 One More Time — Daft Punk" — and puts their
own bio back when the music stops. Runs on Vercel at **telegram.noctorium.xyz**, so nothing needs to be running on
the listener's computer: any Noctorium signed in to their Noctorium account tells it.

## How it fits

```
Noctorium app ──POST /api/now-playing──▶ stats service (stats.noctorium.xyz)
                                              └──POST /api/update (RPC_SECRET)──▶ this server ──▶ Telegram bio
```

- **Connecting:** the account's dashboard has a Connect button. It sends the listener here with a ten-minute ticket
  signed by the account service (`RPC_SECRET`), so this server never sees their Noctorium password. They sign in to
  Telegram on `/connect` (phone, code, 2FA password); the resulting session is kept **encrypted** (AES-256-GCM,
  `RPC_ENCRYPTION_KEY`) in the account service's database (`telegram_links`), with the bio they had.
- **Updating:** `POST /api/update` with `{userId, track}` from the account service only. At most one bio change every
  30 seconds, so Telegram does not flood-limit the account; quick skips collapse into the last song.
- **Disconnecting:** restores the bio, signs this server's session out of Telegram and deletes the link.

The phone number, code and password go straight to Telegram and are never stored.

Telegram's own "music on profile" is not used: it would mean uploading the recordings themselves to Telegram.

## Settings (Vercel environment variables)

| Name | What |
| --- | --- |
| `DATABASE_URL` | The account service's Neon database |
| `RPC_SECRET` | Shared with the account service and the Discord server |
| `RPC_ENCRYPTION_KEY` | 32 random bytes, base64 |
| `TELEGRAM_API_ID`, `TELEGRAM_API_HASH` | From my.telegram.org › API development tools |

```bash
npm install
npm test
npm run build
```
