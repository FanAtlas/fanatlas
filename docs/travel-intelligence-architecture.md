# FanAtlas Travel Intelligence Architecture

FanAtlas Travel Intelligence is a provider-neutral foundation for future AI features. It does not call AI providers, execute tools, stream responses, persist context, or expose provider names to users.

## Source Of Truth

```
Trip Drafts
  -> Travel Passport
  -> Travel Insights
  -> Global Travel Explorer
  -> Travel Context Engine
  -> Tool Planner
  -> AI Orchestrator
  -> Future Provider Adapters
```

Trip Drafts continue to own trip planning data, itinerary, places, journal entries, photo references, and completion state. Passport owns completed-travel eligibility. Insights own derived statistics. Explorer owns geographic read models. Travel Intelligence owns only ephemeral context composition, permission enforcement, minimization, tool planning, capability matching, usage estimates, and safe trace metadata.

## Context Pipeline

1. A `TravelIntelligenceRequest` declares the task, scope, locale, permissions, usage constraints, and normalized user intent.
2. `buildTravelContext()` selects only requested records and creates minimized projections.
3. Field-level policies classify and gate personal, sensitive, and highly sensitive data.
4. Context budgeting trims optional sections first, starting with memory metadata and oversized saved-place lists.
5. The resulting context includes provenance, warnings, a privacy summary, and an estimated character size.

Context is never written to localStorage, sessionStorage, IndexedDB, Supabase, URLs, or provider logs.

## Privacy Classes

- `public`: destination facts such as canonical country names.
- `application`: feature state and nonprivate route names.
- `personal`: trip titles, saved places, itinerary summaries, preferences.
- `sensitive`: travel dates, precise location, Journal body, document metadata.
- `highly_sensitive`: identity documents, payment details, authentication tokens, medical details.

Highly sensitive fields are modeled but not allowed through the Part 1 context pipeline.

## Tool Planning

The static tool registry defines anticipated tools with privacy level, read/suggest classification, permission requirements, network requirements, and enabled state. Part 1 only plans tools; it never executes them.

Network-backed tools are disabled by default unless future policy explicitly enables external research. Write and external-action tools are not executable in Part 1.

## Orchestration

The orchestrator matches task requirements to provider-neutral model capabilities. It can select a capable model profile, use a capable fallback, block when tools are unavailable, or mark a task unsupported. It never falls back to an incapable model just to produce an answer.

Provider roles are internal:

- primary concierge role for conversation, planning, itinerary generation, and multilingual responses
- visual/location role for future image and map reasoning
- long-document role for future visa, customs, and document analysis
- local low-risk role for future low-cost summaries and categorization

## Safety And Current Information

Emergency, visa, customs, transportation, place-recommendation, and budget tasks are marked as current-information dependent where stored FanAtlas data is insufficient. Part 1 returns warnings and blocked plans; it does not generate substantive high-stakes advice.

## Logging And Traces

Safe logs may include request ID, task type, capability requirements, model IDs, tool IDs, reason codes, warning codes, context section presence, size class, latency class, and cost class.

Safe logs must not include raw user prompts, Journal body, precise coordinates, document content, photo IDs, authentication data, provider keys, or full Trip Draft payloads.

## Feature Flags

Only `travelIntelligenceFoundation` is enabled by default. Provider calls, tool execution, image understanding, document analysis, travel research, write actions, developer diagnostics, and the future user-facing FanAtlas AI remain disabled.

## Known Limitations

- No provider adapters are implemented in Part 1.
- No AI SDK packages are installed.
- No diagnostic UI route was added because the current app does not have a production-isolated developer route convention.
- Token estimation uses deterministic character-size classes rather than provider tokenizers.
- Tool schemas are TypeScript-friendly placeholder contracts, not executable validators.
