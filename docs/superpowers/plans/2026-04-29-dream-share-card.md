# Dream Share Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a private dream detail share-card preview and PNG download flow inspired by the provided moonlit glass-card reference.

**Architecture:** Keep the feature frontend-only for this slice. `DreamDetailPage` owns when the share-card panel is visible, a focused `DreamShareCard` component renders the preview, and a small canvas utility exports a PNG without adding new dependencies.

**Tech Stack:** React, TypeScript, Canvas 2D API, Vitest, Testing Library, existing CSS visual system.

---

### Task 1: Share Card UI Entry

**Files:**
- Modify: `dreamlog-frontend/src/dreams/DreamDetailPage.test.tsx`
- Modify: `dreamlog-frontend/src/dreams/DreamDetailPage.tsx`
- Create: `dreamlog-frontend/src/dreams/DreamShareCard.tsx`

- [ ] Write a failing test that a private dream detail page shows a share-card panel, opens preview, and calls PNG download.
- [ ] Write a failing test that community dream detail pages do not show the share-card entry.
- [ ] Implement `DreamShareCard` with image/title/date/summary/keywords/mood pills/DreamLog footer.
- [ ] Render the share-card panel only for `source="mine"`.

### Task 2: PNG Export

**Files:**
- Create: `dreamlog-frontend/src/dreams/shareCardExport.ts`
- Test through: `dreamlog-frontend/src/dreams/DreamDetailPage.test.tsx`

- [ ] Implement a dependency-free Canvas exporter that draws a 1080x1350 card.
- [ ] Use generated dream image when present; otherwise draw a dreamy gradient fallback.
- [ ] Trigger a browser download named `dreamlog-share-card-<dream-id>.png`.

### Task 3: Visual Polish And Verification

**Files:**
- Modify: `dreamlog-frontend/src/styles.css`

- [ ] Add reference-inspired glass frame, glowing border, large art area, summary block, keyword chips, mood capsules, and footer.
- [ ] Run targeted tests, full frontend tests, build, and browser smoke verification.
