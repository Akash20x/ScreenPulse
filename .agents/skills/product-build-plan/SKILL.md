---
name: product-build-plan
description: Create a detailed, implementation-ready build plan from a raw web-app idea. Use when scoping a new web product before coding, not for implementing an already-approved plan.
---

# Product Build Plan

Turn a raw product description into a decision-useful build plan: specific enough for implementation, honest about unknowns, and proportionate to the product. The plan is a source of truth for the proposed V1, not a generic technology checklist.

## Intake and research

Read the supplied description, linked artifacts, and any relevant repository context. Extract stated requirements, constraints, actors, data, integrations, quality attributes, and exclusions.

Do not block on ordinary omissions. State reasonable assumptions in the plan and include only the unresolved questions that would materially change architecture, scope, cost, compliance, or the user experience. If the description depends on current provider limits, APIs, laws, prices, or product capabilities, verify those facts from primary sources before making the recommendation.

Choose technologies from the requirements rather than reflexively prescribing a stack. Explain consequential choices and viable alternatives briefly. When a user gives constraints such as a budget, hosting preference, framework, privacy requirement, target device, or existing subscription, treat them as engineering requirements. Do not quietly substitute a paid or less-private service.

Before drafting, read [the plan blueprint](references/plan-blueprint.md). Scale it down for a simple app; omit sections that do not apply and explicitly note important non-applicability where it prevents a wrong expectation (for example, no account system or no background processing).

## Planning method

1. Define the product outcome and the smallest coherent V1. Separate core capabilities from optional enhancements and explicit non-goals.
2. Describe the end-to-end user flow, including the meaningful failure/recovery path for every asynchronous, permissioned, or state-changing action.
3. Map the system boundary: client surfaces, backend/services, third parties, storage, trust boundaries, and data movement. Use compact diagrams where they clarify relationships.
4. Specify data ownership, lifecycle, retention/deletion behavior, authentication/authorization, validation, idempotency/concurrency, and privacy/security controls to the degree the product needs.
5. Define APIs, background jobs/events, error contracts, operational limits, and edge cases only where they materially affect the build.
6. Convert requirements into a dependency-aware build order. Each phase must leave the product in a testable state and call out acceptance checks.
7. Finish with a test matrix, concrete definition of done, setup/deployment considerations, assumptions, known limitations, and open decisions.

## Quality bar

- Preserve precise language: distinguish a promise from a best-effort behavior, and a requirement from a recommendation.
- Include security, privacy, accessibility, and cost controls early when the app handles personal, financial, health, location, credentials, uploads, or other sensitive data.
- Make reliability mechanics explicit for uploads, webhooks, queues, payments, retries, duplicate events, and offline use. Do not imply guaranteed background behavior a platform cannot provide.
- Prefer named interfaces, entities, routes, states, and acceptance criteria over vague phrases such as "handle errors" or "make it secure."
- Keep an idea that works without optional AI, analytics, or automation useful without those layers unless the user explicitly makes one essential.
- Do not produce implementation code, modify the project, create accounts, or deploy unless the user separately asks.

## Deliverable

Return a Markdown document headed `# <Product Name> — End-to-End Build Plan`. Use the blueprint as a menu, not a rigid template. Make it self-contained enough that a later implementation agent can use it as the V1 source of truth. Lead with the product goal and core flow; put assumptions and open questions near the end so they do not obscure the usable plan.

When asked to save the output, write it to the user-specified location; otherwise return it in chat. Offer a concise follow-up prompt the user can use to turn the plan into a phased implementation task.
