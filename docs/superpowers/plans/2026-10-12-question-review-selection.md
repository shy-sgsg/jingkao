# Selectable Mistake and Favorite Review Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users inspect and select individual incorrect or favorited questions in all seven aptitude modules, then review the selected questions through the existing session flow.

**Architecture:** Add one shared renderer and selection handler in `src/app.js`, using each module’s existing question bank and independent study store. Expand selected shared-stimulus groups atomically; start a normal practice session from the selected published questions plus any required members of their shared-stimulus groups. Add compact responsive styles in `src/styles.css`.

**Tech Stack:** Existing vanilla JavaScript app, HTML templates, CSS, current practice-session adapters.

**Spec:** User-confirmed interaction in the conversation on 2026-10-12.

## Global Constraints

- Cover the five general aptitude modules, Science Reasoning, and General Knowledge.
- Show full question stem and options without answer or explanation before answering.
- Preserve each module’s independent mistakes, favorites, sessions, and answers.
- Select shared-stimulus questions as a complete group.
- Leave unrelated pending question-bank files untouched in this feature commit.

## Review Focus

- Empty or stale mistake/favorite IDs must not start an empty or partial session.
- Selecting any question with shared material must include its whole published group.
- The review list must never render correct answers or explanations.
- Selected sessions must route to the corresponding module and use its existing answer/review flow.
- The selection controls must remain usable at mobile widths.

---

### Task 1: Shared selection list and module page integration

**Files:**
- Modify: `src/app.js`
- Modify: `src/styles.css`

**Interfaces:**
- Renderer accepts a module ID, module label, published bank, mistake IDs, and favorite IDs.
- Each list panel exposes selected question IDs through checkbox values and action buttons through `data-action` attributes.

- [x] Add a shared renderer that creates separate mistake/favorite tabs, expandable question previews, per-question checkboxes, select-all, selected count, and empty states.
- [x] Include published questions linked to a matching shared-stimulus question and mark the linked entries as included with that group.
- [x] Render the shared selection list on general aptitude module pages, Science Reasoning, and General Knowledge.
- [x] Add responsive styles for list rows, question previews, tabs, and selection controls.

### Task 2: Selected review session flow

**Files:**
- Modify: `src/app.js`

**Interfaces:**
- `start-selected-question-review` reads the checked IDs from the active list and creates a practice session in the owning module’s existing study store.

- [x] Add delegated handlers for list tabs, select-all, shared-stimulus group selection, and selected-count updates.
- [x] Filter checked IDs against the owning module’s published bank; reject empty or unavailable selections.
- [x] Create a practice session using the selected questions plus complete shared-stimulus groups and navigate to the correct module session route.

### Task 3: Build and release

**Files:**
- Verify: `npm run build`
- Commit: feature files and this plan only.

- [x] Run `npm run build` and inspect the output for errors.
- [x] Confirm `git diff --check` passes and pending question-bank files are not staged.
- [ ] Commit the feature and plan, then push the commit to `main`.
