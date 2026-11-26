# Product build-plan blueprint

Use the sections below according to the product's complexity. A small local utility might need only goal, flow, architecture, delivery phases, tests, and definition of done. A multi-user, data-sensitive, or integration-heavy product normally needs most sections.

## Recommended plan shape

1. **Project goal** — user, problem, outcome, V1 boundary, fixed constraints.
2. **Core user flow** — a happy-path flow diagram plus key recovery paths.
3. **Product rules and non-goals** — behavioral promises, exclusions, and platform limitations.
4. **Recommended stack and decision rationale** — components, responsibilities, cost/privacy implications, and alternatives only for consequential choices.
5. **System architecture** — components, data movement, trust boundaries, and external services.
6. **Codebase structure** — apps/packages/modules sized to the product; avoid abstract structures without a need.
7. **Identity and access** — actors, sign-in, roles, authorization checks, sessions/tokens, and revocation when applicable.
8. **Domain model and data lifecycle** — entities, key fields, ownership, relationships, indexes/unique constraints, retention, deletion, and audit needs.
9. **Interfaces and integrations** — UI surfaces, API/event contracts, validation, pagination, rate/size limits, external failure behavior, and webhooks if relevant.
10. **Feature design** — major screens or capabilities, states (empty/loading/error/permission/expired), and accessibility/mobile requirements.
11. **Reliability and edge cases** — retries, idempotency, concurrency, offline behavior, scheduled/background limitations, recovery, and observability appropriate to risk.
12. **Security, privacy, and compliance** — sensitive data inventory, least privilege, secrets, encryption/access control, user consent, exports/deletion, and applicable regulatory questions. Avoid compliance claims that need specialist review.
13. **Cost and operational model** — free/paid assumptions, capacity drivers, quotas, cleanup, deployment, backups, and provider-specific facts that must be rechecked.
14. **Testing strategy** — unit, integration, end-to-end, manual platform tests, accessibility, security tests, and a scenario matrix focused on failure paths.
15. **Development and release** — local setup, configuration/secrets, migrations, environments, CI/CD, rollout/rollback only if relevant.
16. **Phased build order** — dependency-aware phases; each includes scope, integration point, verification, and exit criterion.
17. **Definition of done** — numbered observable outcomes that prove V1 works end to end.
18. **Assumptions, open decisions, known limitations, and future options** — clearly segregated so they cannot be mistaken for committed scope.

## Detail conventions

- Use diagrams for flows and architecture that involve three or more components or branches.
- Name API routes, events, tables/entities, and status values when they are central to implementation. Use conceptual schemas when exact framework syntax is premature.
- State the owner of each repeated decision: client vs. server, local vs. cloud scheduler, foreground vs. background, and source of truth.
- Give exact defaults and bounds only when backed by requirements, platform constraints, or a transparent starting assumption.
- Include a test case for each significant promise, especially permission denial, incorrect identity, duplicate requests, interrupted work, deletion, expired access, and unsafe input.
