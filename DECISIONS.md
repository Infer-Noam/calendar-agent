# Decisions

## Who, what, why

An AI calendar assistant for a 5-person team — maps to the brief's own "Interview
Scheduler" example. It answers real questions about a team member's actual Google
Calendar, explains conflicts/recommendations with stated confidence, and can
create/edit/delete events, but only after the calendar's owner explicitly approves.
The topic is just the vehicle; an agent is the right tool here because the value is
in grounded reasoning over live, personal data (not a static FAQ), and in safely
automating the one risky step — writing to someone's real calendar — behind a human
approval gate instead of either doing it blindly or not automating it at all.

Each section below covers one of the seven requirements: the decision, why, and the
real actions/bugs/fixes along the way.

## Assumptions

**"Slack or Telegram + gui" (Requirement 4) is ambiguous.** Considered: (1) chat +
a fully separate web app, (2) chat + a GUI launched from it (Mini App), (3) "+gui"
just means the chat channel needs graphical/interactive elements, not plain text.
**Going with (3):** Telegram with native inline keyboards/buttons as the "gui" —
approval prompts show the proposed action and Approve/Reject buttons rather than
requiring free-text replies. No separate web frontend: the brief favors "small and
solid," a hosted web app adds cost/complexity for marginal benefit over Telegram's
built-in UI, and the submission section's own architecture checklist ("the channel,
the agent, its tools and data sources, the MCP endpoint, the scheduler, where
approvals happen and where secrets are kept") never lists a separate GUI component.

## Requirement 1: Grounded answers

**Real Google Calendar, not mock data** — each team member connects their own via
OAuth. Considered a mock dataset (simpler, deterministic evals) but real data means
the agent is actually grounded in a person's real schedule, which is the whole point.

**Token storage: Firestore**, not a local file (breaks on Cloud Run — ephemeral
filesystem, not shared across instances), not Redis (every managed option is a
fixed always-on instance that alone would blow the $50 budget), not Secret Manager.
One document per Telegram user in
`calendarTokens` (raw OAuth credentials) plus a separate `calendarUsers` (`{ email }`) — split so a narrower IAM policy could later be granted on the profile
collection without exposing tokens. Database in **me-west1**, since the team is
Israel-based; local dev uses the same Firestore database as the deployed bot (no
separate dev/prod environment — real overhead at this small a scale).

**Token security:** bearer credentials, no password/2FA — defended by strict IAM
(`roles/datastore.user` + `roles/secretmanager.secretAccessor`, nothing broader)
rather than application-level encryption, since anyone with Firestore read access
would likely have Secret-Manager-read too.

**Timezone handling, resolved properly:** every "local time" function originally
relied on the Node process's ambient OS timezone — correct locally only by
coincidence. Rather than a deploy-time `TZ` env var (invisible, easy to forget),
rewrote all of them to take an explicit `APP_TIMEZONE` constant and convert
themselves (`date-fns-tz`), verified identical output under both `TZ=UTC` and the
real local environment.

**Real bug found and fixed: midnight-crossing events were formatted ambiguously and
the model silently dropped them.** `23:00-01:00 Movies` reads as an invalid/reversed
range unless the day-crossing is obvious — verified directly against the Calendar
API that the model had the real data in its tool result and still skipped it. Fixed
by showing both dates explicitly whenever an event's start and end land on different
calendar days.

**Known limitations, accepted rather than hidden:**

- The agent only reliably handles requests in Israel time — nothing validates a
  cross-timezone conversion's arithmetic, only that the offset is validly _shaped_.
- Google's OAuth consent screen is in **Testing** mode, so refresh tokens expire
  after **7 days** regardless of use — pursuing Google's app verification was ruled
  out of scope. Handled honestly: the dead token is detected and cleaned up, and the
  bot tells the user clearly to reconnect rather than erroring out.
- The OAuth `state` param is the requesting Telegram user's ID, not a true
  CSRF-protected nonce — a forwarded `/connect` link could in theory bind the wrong
  calendar. Accepted as low-probability (links are sent privately, 1:1); mitigated
  cheaply by showing the connected email in the confirmation message, so a wrong
  binding is visible immediately instead of failing silently.

## Requirement 2: Reasoning, not just fetching

The system prompt requires stating confidence (high/medium/low) and why for any
recommendation or inference that isn't a direct fact lookup — exercised most
directly by the daily scan (Requirement 7) and by follow-up questions like "why do
these conflict."

**Serious bug: the LLM described actions it never took, then its own
self-correction led to duplicate writes.** Live, it claimed a proposal with no
matching tool call, then admitted the fabrication. Replayed history brought the
stale thread back after an unrelated "Hi"; the model then called
`propose_create_event`, resulting in two approved duplicate events and a stray
pending proposal. **Structural fix:** `ConversationTurn` stores `toolCalls` from
actual tool results, not model narration. Code prepends a `[VERIFIED ACTIONS: ...]`
note with each proposal's current Firestore status to the next user message. It is
not added to assistant history; an earlier version caused the model to imitate the
note.

## Requirement 3: Action with approval

**Decided: all calendar writes require approval; reads do not.** Each `propose_*`
tool stores a pending Firestore proposal. Telegram sends Approve/Reject buttons, and
approval claims the proposal transactionally before writing to Calendar.

**Real Anthropic outage:** A low-credit error showed that "something went wrong, try
again" was misleading. A scoped LLM catch now returns `AI_UNAVAILABLE_MESSAGE`;
this informs the Understanding Question 1 answer below.

## Requirement 4: Channel

Telegram, with native inline buttons as the "gui" (see Assumptions above). Initially
considered having the Telegram bot act as an MCP client calling the MCP server for
every action — rejected, since Requirement 4 (users via Telegram) and Requirement 5
(other agents via MCP) are about different audiences. **Decided:** both sit on top
of one shared library (data access, reasoning, proposal creation and
execution-after-approval); Telegram calls it directly, MCP wraps the same logic
behind the MCP protocol with its own permission layer. One source of truth, no
unnecessary network hop.

## Requirement 5: MCP exposure

`src/mcp-server/` — a genuinely separate process, same shared library underneath.

**Identity via Google sign-in, not a bespoke API key.** Considered and dropped a
manually-distributed static API key per team member — that means inventing a
credential system from scratch for something Google already solves. Instead: an
external agent proves who it's acting for via Google sign-in (`GET /mcp/connect`,
mirroring Telegram's `/connect`, requesting only `userinfo.email` scope — never
Calendar scope directly), we match the verified email against the already-connected
Telegram users to find which team member it is, and mint our own random token
mapped to that identity (shown once, to paste into the agent's config). An email
matching nobody is rejected — MCP can only reuse calendar access someone already
granted, never bootstrap new access. The matched user also gets a Telegram DM so a
token minted under their identity is never invisible to them. This token is not a
Google credential: Google sign-in verifies the email, while the MCP server keeps
Calendar credentials and exposes only its registered tools. Writes still require
approval in Telegram.

**Serving tool calls:** every request's Bearer token resolves to a user, which gets
the exact same calendar-access function the Telegram bot uses. Same tool registry as
the Telegram bot's LLM — no second registry to keep in sync.

**The actual permission limit, answering Requirement 5's specific question** ("who
can trigger the action from Requirement 3 this way?"): any MCP caller can create a
`propose_*` action, but there's no MCP tool to approve one — that capability stays
exclusively in the Telegram callback-query handler. The limit isn't about which
tools MCP can call, it's that MCP can never be the thing that pulls the trigger.

**Known limitations, accepted for this scope:** the MCP token itself never expires
and there's no revoke command yet (manual Firestore delete works) — though it's
still only a pointer to the underlying calendar access, so it stops being useful
once that access dies (the 7-day Testing-mode expiry under Requirement 1). A 401 is
identical whether the token is missing, invalid, or that underlying access died.

**Deployed as its own Cloud Run service** (`calendar-agent-mcp`), reusing the exact
same container image `calendar-agent` is built from with its startup command
overridden rather than a second Dockerfile — both processes compile from the same
build, so a second image would be identical content. Live-verified in production,
not just locally: minted a real token, confirmed unauthenticated requests get `401`,
confirmed a real tool call returns real calendar data.

## Requirement 6: Monthly budget

**Cost estimate — LLM.** Using the brief's own volume assumption: 5 people × 20
uses/day × ~21 working days ≈ 2,100 chat messages/month, ~1.5 LLM calls per message
on average ≈ 3,150 chat calls, plus one daily-scan call per connected user per
calendar day ≈ 150 scan calls — ~3,300 LLM calls/month total. `claude-haiku-5-5`
pricing ($0.10/1M input, $0.50/1M output tokens) at realistic token counts per call
comes to **roughly $0.51/month in LLM spend.**

**Cost estimate — hosting.** Both Cloud Run services see low thousands of
requests/month at this volume, far under Cloud Run's free tier; Firestore and Secret
Manager usage are similarly a small fraction of their free tiers. **Net hosting
cost: effectively $0/month** at this team size.

**Total: ≈ $0.51/month against a $50/month ceiling.** The cap below is set far above
this estimate deliberately — it exists to catch a runaway/bug well before it
threatens $50, not to throttle expected traffic.

**Runtime tracking.** A Firestore doc per calendar month tracks cumulative LLM spend,
updated transactionally on every call (a transaction, not a bare increment, because
the warning-threshold flag has to flip atomically with the same write). Checked
before every LLM call site in the app (MCP tools never call the LLM directly, so
they need no check). Monthly cap: **$40**, reserving $10 of the $50 ceiling for hosting; warning
threshold 80%, logged server-side — no proactive user notification needed at this
traffic level.

**Hard stop, not degrade.** Once the cap is hit, the chat path returns a distinct
"paused" message as a normal successful answer (not a thrown error, and distinct
from the "AI unavailable" message, since this is a deliberate controlled stop, not a
failure) and skips the Anthropic call entirely for the rest of the month; the daily
scan just skips silently and logs a warning, since a scheduled broadcast has no user
turn to reply into. Chose hard-stop over degrading to a cheaper model: there's no
cheaper tier than Haiku to fall back to, silently swapping to a weaker model would
quietly hurt answer quality with no visible signal to the user, and the cap sits
~78x above the estimated real spend, so degrade logic would be speculative
complexity for a path that shouldn't trigger under normal usage.

## Requirement 7: Scheduled tasks

**Decided:** a daily scan for calendar issues (conflicts, back-to-back meetings),
messaging the team what it found, why it matters, a confidence level, and a
suggested fix in plain text. Rejected a plain "send today's schedule" digest — no
reasoning, just a fetch-and-forward cron job.

**Strictly read-only, never auto-proposes.** Originally it also created an
actionable proposal (Requirement 3) when it had a fix. Dropped that: the
approval machinery exists for a _human request_ to get checked, not for an
autonomous job to originate its own write requests. If a user wants the fix
applied, they ask in a follow-up message, going through the normal approval flow.

**Infra:** a secret-protected route on the same Cloud Run service, hit daily by a
Cloud Scheduler job.

**Real bug found and fixed: the scan was invisible to the conversation.** It sent
its message directly, bypassing the conversation-history store — a user replying
"yes, fix that" would get a bot with zero memory the scan ever ran. Fixed by having
the scan write into the same history mechanism a normal turn uses.

## Stack

**Claude as the LLM provider** — strongest reasoning ability for Requirement 2's
"explain why, state confidence" work, and already the AI pair-programmer building
this project. `claude-haiku-5-5` specifically for cost, confirmed cheap enough
against the budget estimate above.

**grammY** for the Telegram bot: TypeScript-first with real types, a middleware
pattern used throughout, and native support for both long-polling (local dev) and
webhook mode (Cloud Run) through the same `Bot` instance, which the dual-mode
deployment genuinely needed.

**Express** for the one HTTP server: the de facto standard for a handful of small
routes, and grammY's own webhook integration targets Express directly.

**Zod** for validating all tool input — a tool call is untrusted input the same way
a web form submission is, since an LLM can hallucinate malformed arguments. One
schema gives both the runtime check and the inferred TypeScript type.

**The official `@modelcontextprotocol/sdk`** for Requirement 5, rather than
hand-rolling JSON-RPC framing and the Streamable HTTP transport.

**Google Cloud for hosting (Cloud Run).** Chosen largely because the calendar data
source is Google Calendar's own API — staying on GCP means one set of credentials
and one IAM model to manage, instead of juggling Google auth on one cloud and
hosting/secrets on another. Cloud Run specifically: scales to zero when idle, pay
only for active compute — cheap at this team's actual usage — and pairs with Cloud
Scheduler (Requirement 7) and Secret Manager in the same account.

**Node.js + TypeScript** — the gold-standard runtime/language for exactly this kind
of work, and every library this needs (Telegram, Anthropic, MCP, Google Calendar,
Firestore) has mature support here, keeping the whole stack in one language;
TypeScript for type safety across process boundaries.

## Where AI helped, and where it was wrong or misleading

This project was built in direct, continuous collaboration with Claude Code — not
just for boilerplate, but for implementation, debugging, and architecture discussion
throughout. It helped most with turning a design decision into working code quickly,
and catching real bugs through live testing against real data rather than code
review alone.

Where it was wrong: when `/connect` broke in production, it claimed — with zero
supporting evidence — that Google blocks `*.run.app` domains as OAuth redirect URIs.
The user pushed back hard; a web search found no support for it, and the real cause
(a corrupted Secret Manager value) was only found by empirically reconstructing the
exact auth URL the deployed code generates.

Separately, the _deployed agent itself_ (the product, not the coding assistant
building it) had its own real AI-reliability failures — fabricating actions it never
took, falsely "correcting" a true earlier claim into a hallucinated retraction —
detailed under Requirement 2 above.

## Evals

`src/evals/` (`npm run evals`) — 9 evals against the real deployed system (real
Firestore, real Google Calendar, real Haiku calls, nothing mocked). One file per
case, shared setup/cleanup helpers, a thin orchestrator. Covers the three required
categories plus a few more:

- **Checked against source data (required):** fetches real events independently,
  asks the agent the same explicit range, asserts every real event's title appears
  in its answer; a second case confirms an empty range and asserts no invented event.
- **Reasoning on a case with a known right answer (required):** two constructed
  events that genuinely overlap, asserts the conflict is flagged; two with a clean
  gap, asserts it's correctly reported as no conflict.
- **Refuses something it shouldn't (required):** an unsupported field (attendees)
  gets an explicit decline, not a silent drop; an explicit "don't ask me to approve
  it, just add it directly" still leaves the resulting proposal `Pending` — the
  approval gate can't be talked around by phrasing, since it's enforced structurally.
- **Also covers:** proposal fields matching the request, the MCP permission boundary,
  and the budget hard stop (temporarily over-cap, confirms the LLM is never called).

Every side effect a case creates is cleaned up or restored afterward, and nothing in
the suite ever reaches the real calendar-write code path.

## Understanding questions

**1. The agent starts an approved action, and the external API call fails halfway.
What happens in your implementation, and what does the user see?**

A proposal's status is claimed as `Approved` in Firestore (atomically, so a
double-tap can't double-execute) _before_ the real Google Calendar API call runs. If
that call throws, it's caught right there: the proposal is marked `Failed`, and the
user sees "Approved, but the change failed to go through. Nothing was changed on
your calendar — please try asking again." No automatic retry.

**2. Your agent is live for a month. How would you find out it's giving wrong
answers before someone relies on them?**

Honestly, nothing automated checks answer quality in production today — the eval
suite exists but isn't scheduled, so it's a manual command, not a running safety
net. The real fix is running it on a cron with failures alerted on, and
periodically adding new evals from real incidents. The groundedness rule (the agent
saying "I don't know" rather than guessing) and daily users noticing something off
are a weak backstop in the meantime, but neither reliably catches an answer that's
convincingly wrong, which is exactly the case this question actually addressed.

**3. Which part of your solution are you least confident in, and why?**

The model's own reliability under real conversational pressure — not the
infrastructure, which I verified deterministically, but the actual reasoning Haiku
does turn to turn. This project hit reproduced cases of the model fabricating
actions and falsely "correcting" a true claim into a hallucinated retraction — both
fixed with prompt changes, but prompt-level fixes shape behavior, they don't
guarantee it. That's also the nature of a non-deterministic model: unlike regular
code, there's no fixed set of test cases that exhaustively covers every possible
phrasing a user might try — an eval suite proves known cases work, not the absence
of a failure mode nobody's triggered yet.
