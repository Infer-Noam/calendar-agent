# calendar-agent

An AI calendar assistant. Talk to it on Telegram, or connect your own AI agent to it over MCP.

**Talk to the deployed bot:** [@infernoam_calender_bot](https://t.me/infernoam_calender_bot) — send `/connect` to link a Google Calendar.

## Deployment

Deployed on Google Cloud Run as two services, both built from this repo's `Dockerfile` (project `eshkol-fullstack-home-task`, region `me-west1`):

- **`calendar-agent`** — the Telegram bot, OAuth callback, and scheduled-task routes. Runs the image's default command (`node dist/core-server/index.js`).
- **`calendar-agent-mcp`** — the MCP server. Reuses the **exact same container image** as `calendar-agent`, just with its startup command overridden (`node dist/mcp-server/index.js`), so only one image ever needs building.

A **Cloud Scheduler** job (`daily-calendar-scan`, `0 7 * * *` Asia/Jerusalem) calls `calendar-agent`'s `POST /tasks/daily-scan` once a day for the scheduled calendar scan.

All secrets live in **Secret Manager** and are injected as env vars at deploy time — nothing is committed to the repo (`.env` is gitignored; `.mcp.json` only ever holds a placeholder token).

To redeploy after a code change:

```bash
gcloud run deploy calendar-agent --source . --region me-west1
```

Then point `calendar-agent-mcp` at that same freshly-built image, so both services stay on one build:

```bash
IMAGE=$(gcloud run services describe calendar-agent --region me-west1 --format="value(spec.template.spec.containers[0].image)")
gcloud run deploy calendar-agent-mcp --image="$IMAGE" --region me-west1
```

Environment variables / secrets each service needs (set once via `--set-secrets` when the service is first created; a plain redeploy as above keeps them):

| Variable                                                                  | `calendar-agent` | `calendar-agent-mcp` | Purpose                                                                                                |
| ------------------------------------------------------------------------- | ------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------ |
| `TELEGRAM_BOT_TOKEN`                                                    | required           |                        | Telegram Bot API                                                                                       |
| `ANTHROPIC_API_KEY`                                                     | required           |                        | LLM calls                                                                                              |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | required           | required               | Google OAuth                                                                                           |
| `GOOGLE_CLOUD_PROJECT`                                                  | required           | required               | Firestore                                                                                              |
| `DAILY_SCAN_SECRET`                                                     | required           |                        | Authenticates Cloud Scheduler's call to `/tasks/daily-scan`                                          |
| `NOTIFY_PROPOSAL_SECRET`                                                | required           | required               | Authenticates `calendar-agent-mcp`'s call to `calendar-agent`'s `/tasks/notify-proposal`         |
| `CORE_SERVER_URL`                                                       |                    | required               | Where `calendar-agent-mcp` sends that notify-proposal call                                           |
| `WEBHOOK_URL`                                                           | required           |                        | Set to the service's own URL so Telegram delivers updates via webhook, not long polling, in production |

## Approval workflow (for testers)

No action is ever taken on anyone's calendar without that calendar owner's explicit approval:

1. Creating, editing, or deleting an event — whether asked for in a normal Telegram message or requested by an external agent over MCP — only ever creates a **pending proposal**, never a real change.
2. The calendar's owner (the person who ran `/connect`) gets a message in that same Telegram chat showing the proposed change, with **Approve** / **Reject** buttons.
3. Only that owner can act on it — the buttons are tied to their Telegram identity, so even an MCP-issued proposal can only be approved by the human who owns the targeted calendar, never by the calling agent itself.
4. Nothing is written to Google Calendar until they tap **Approve**.

## Running locally

Prerequisites: Node.js 20+, a Telegram bot token (create one via [@BotFather](https://t.me/BotFather)), a Google Cloud project with the Calendar API enabled and an OAuth 2.0 client, an Anthropic API key, and the [gcloud CLI](https://cloud.google.com/sdk/docs/install) authenticated against that same GCP project.

1. `npm install`
2. `cp .env.example .env` and fill in each value:
   - `TELEGRAM_BOT_TOKEN` — from BotFather.
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — from your Google Cloud OAuth client.
   - `GOOGLE_REDIRECT_URI` — leave the default (`http://localhost:3000/oauth/callback`) and add that exact URI to the OAuth client's allowed redirect URIs.
   - `GOOGLE_CLOUD_PROJECT` — the GCP project ID backing Firestore.
   - `ANTHROPIC_API_KEY` — your Anthropic API key.
   - `DAILY_SCAN_SECRET` / `NOTIFY_PROPOSAL_SECRET` — any random strings; these just authenticate internal calls between the two local servers.
   - `CORE_SERVER_URL` — leave as `http://localhost:3000`.
3. `gcloud auth application-default login` — the app talks to Firestore using your local Application Default Credentials, against the **same** Firestore database the deployed bot uses (there's no separate local/dev database — see `DECISIONS.md`).
4. Start the Telegram bot (OAuth callback + daily-scan/notify routes + long-polling, since no `WEBHOOK_URL` is set locally): `npm run dev:bot`
5. In a separate terminal, start the MCP server: `npm run dev:mcp`

For a production-like run instead of `tsx watch`, build first (`npm run build`) and run `npm run start:bot` / `npm run start:mcp`.

## Running the evals

```bash
npm run evals
```

Runs 9 evals in `src/evals/` against the real deployed system — real Firestore, real Google Calendar, real Haiku calls, nothing mocked. Needs at least one Telegram user who's already run `/connect` (same prerequisite as running the bot itself); it uses whichever connected account it finds first. Prints `PASS`/`FAIL` per case and exits non-zero if any fail.

Every side effect a case creates along the way (a test proposal, a turn in that user's conversation history, the monthly budget doc) is cleaned up or restored afterward, and no eval ever reaches the code path that actually writes to Google Calendar — the real calendar itself is never touched.

## Using it via MCP

This repo's `.mcp.json` already lists the server, but the placeholder token in it won't work until you swap in your own. To get one:

1. First, connect your calendar via Telegram: message the bot and send `/connect`, then sign in with Google.
2. Once that's done, open this URL in your browser and sign in with the **same** Google account:
   [https://calendar-agent-229218111347.me-west1.run.app/mcp/connect](https://calendar-agent-229218111347.me-west1.run.app/mcp/connect)
3. The page that loads shows your token. Copy it.
4. Open `.mcp.json` in this repo and replace `YOUR_MCP_TOKEN_HERE` with that token.

Your token is tied to your own calendar access — never share it, and never commit it back into `.mcp.json` after filling it in.

Once set, any MCP-compatible client (Claude Code, Claude Desktop, or your own agent) can connect to `calendar-agent` and call its tools: `list_events`, `propose_create_event`, `propose_edit_event`, `propose_delete_event`. Proposed changes still need approval via the Telegram bot before anything is actually written to your calendar.
