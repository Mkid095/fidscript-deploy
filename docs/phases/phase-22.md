# Phase 22: AI Layer

> **Status:** Planned  |  **Track:** Ecosystem  |  **Depends on:** Phase 02, Phase 14, Phase 15, Phase 03

## Objective

AI that does **real, grounded work**: chat, deployment diagnosis, and assistance — backed by a real model, safe key handling, streaming, and **platform context** (logs, failed deployments, firing alerts) so its answers are accurate, not hand-waved. Today the Gemini call is real but the module won't compile, the key is passed as a query parameter, and there's no streaming, retry, or budget.

## Current State

**STUB / broken.** See `docs/AUDIT.md` §C (AI). Specific defects:

- The Gemini call itself is real — but the module **won't compile** (AUDIT blockers #1 `EventsService` import, #2 `AI_PROVIDER` DI mismatch; fixed structurally in Phase 00, verified running here).
- **No streaming.**
- API key **passed as a query parameter** (logged/cached everywhere) — a secret leak.
- No retry, no budget/cost controls, no timeouts.

## Dependencies

- **Phase 00** (module compiles; DI token aligned).
- **Phase 02** (events; AI actions emit + can react to events).
- **Phase 14 + 15** (the *context* for diagnosis — metrics, alerts, logs).
- **Phase 03** (admin scoping for cross-project diagnosis).

## Deliverables

- [ ] **Compiles and runs.** The AI module builds and boots (Phase 00 fixes the import + DI bugs; this phase verifies the runtime path).
- [ ] **Provider abstraction.** An `AiProvider` interface (`chat`, `stream`, `embed`…). **Gemini** is the first implementation; OpenAI/Anthropic-ready (Development Rule 5 — never hardcode the vendor in callers).
- [ ] **Safe key handling.** `GEMINI_API_KEY` read from `GEMINI_API_KEY_FILE` (Docker secret); **never** in URLs/query params/code; **fail closed** if missing.
- [ ] **Grounded diagnosis.** "Diagnose this deployment" pulls **real platform context** — recent logs (15), failed deployments (06), firing alerts (14), queue depth (11) — for the target project, and the model's answer cites that context. Not a generic guess.
- [ ] **Streaming.** Chat/diagnosis stream tokens to the client (SSE) for responsive UX.
- [ ] **Reliability + cost.** Retries with backoff, per-request timeout, a per-project token/cost budget with usage tracking, and rate limiting.
- [ ] **Tenant safety.** Context is scoped to the requesting user's project (or platform-wide only for admins via `PlatformAdminGuard`). The model never sees another tenant's data.
- [ ] **Capabilities.** Chat copilot, deployment diagnosis, template/scaffold suggestions, natural-language → platform action (e.g. "scale my deployment" drafts the call for confirmation).

## Technical Design

- **Provider interface:** `interface AiProvider { chat(req): Promise<Resp>; stream(req): AsyncIterable<Chunk>; }` injected by symbol that matches `@Inject(...)` (the Phase 00 DI fix). A `GeminiProvider` implements it; a config flag selects the provider.
- **Context builder:** for diagnosis, assembles a compact, redacted snapshot from Logs/Monitoring/Deployments scoped to `projectId` (membership-validated). Secrets redacted before sending.
- **Key from `_FILE`:** read once at boot; passed in the Authorization header / SDK config, never the URL.
- **Streaming:** the API endpoint returns SSE; the provider streams chunks; the dashboard renders incrementally.
- **Budget:** a per-project monthly token budget (configurable); usage recorded; over-budget returns a clear error, not silent spend.

## Integration Points

- **Events emitted:** `ai.query.requested/completed/failed`, `ai.diagnosis.generated`. Consumed by audit (02).
- **Service registry:** registers `ai`.
- **SDK (16):** `ai.chat`, `ai.diagnose` (streaming).
- **MCP (17):** an `ai.diagnose` tool for agents.
- **Dashboard (19):** AI copilot panel, "diagnose" button on a failing deployment, cost/usage view.

## Verification (VPS)

```bash
# Diagnose a genuinely failing deployment (break it on purpose) with real logs:
curl -fsS -N -X POST .../api/v1/ai/diagnose -d '{"deploymentId":"<broken-depl>"}'
# → a grounded diagnosis that references the REAL error from the logs (e.g. "exit code 137: OOM-killed, memoryMb=128 too low"),
#   not a generic guess.

# Chat streams:
curl -fsS -N -X POST .../ai/chat -d '{"prompt":"summarize my project's last 10 errors"}'   # streamed tokens

# Safety:
#   no API key in any URL/logs (grep the reverse proxy logs)
#   key unset at boot → fail closed (no silent default)
#   a non-member of project B cannot diagnose project B (403)
#   swapping the provider to a stub compiles + runs (abstraction holds)
```

**Exit criterion:** AI chat and diagnosis work against a real model with streaming; a diagnosis of a real failure cites the real logs; the key is never in URLs/logs and the app fails closed without it; context is tenant-scoped; cost is tracked. The module compiles and runs.

## Out of Scope / Future

- Fine-tuning / custom models, RAG over user docs — future.
- Autonomous agentic actions (AI performing writes without confirmation) — future, gated behind explicit approval (safety).
- Vision/multimodal — future.

## Risks

- Hallucinated diagnoses that look authoritative → ground every answer in retrieved platform context and cite it; prefer "I can't tell from the available logs" over confabulation.
- Cost runaway → enforce budgets + rate limits from day one; surface usage.
- Key leakage via logs/proxies → header-only transport, redact in logs, fail closed.

## Files you'll touch (precision map)

- `apps/api/src/modules/ai/ai.service.ts` (Gemini call is real; **key passed as a query parameter**; no streaming/retry/budget) + `apps/api/src/modules/ai/providers/{ai-provider.interface.ts, gemini.provider.ts}` + `ai.controller.ts`. (Compiles now — Phase 00 fixed the DI token + import.)
- Prisma: `AIConversation`, `AIMessage` (accessors `aIConversation`/`aIMessage`).
- Add: an `AiProvider` abstraction (Gemini primary, OpenAI/Anthropic-ready); key from `GEMINI_API_KEY_FILE` (never the URL); streaming (SSE); grounded diagnosis pulling real context from logs(15)/monitoring(14)/deployments(06); per-project budget.

## Next Phase

[Phase 23: Marketplace](./phase-23.md)
