# AnansiWriter — Multi-Phase Implementation Plan (Rev 2)

AnansiWriter is a local-first novel and series management application deployed as a static site on GitHub Pages, with all project data stored in the browser's IndexedDB. No server-side persistence, no user accounts.

---

## Open Design Decisions (Section 52 Answers)

| # | Question | Decision |
|---|---|---|
| 1 | Rich-text editor | **TipTap** (current stable) — JSON doc model, extensible, ProseMirror foundation |
| 2 | Project package format | **ZIP** (`.storyproject`) — `manifest.json` + `database.json` + `assets/<uuid>.<ext>` as binary; JSON references assets by UUID |
| 3 | Binary assets | **Binary inside ZIP** — no Base64; database.json stores UUID + metadata only |
| 4 | Prompt library scope | **Project-local only initially**; global cross-project in Phase 5 |
| 5 | Bible templates | **Global built-ins + project-local custom templates** |
| 6 | Occurrence indexing | **Debounced dirty-scene queue**, run in a Web Worker; not every autosave cycle |
| 7 | Ambiguous alias resolution | **Review queue UI** — user confirms or dismisses candidates |
| 8 | Timeline UI | **Narrative position field on each Scene/Event**; visual timeline view in Phase 4 |
| 9 | AI request history | **Configurable limit by size (default 50 MB) + age (default 90 days) + count (default 500)**; metadata and full payload stored separately; user can choose metadata-only mode |
| 10 | Snapshot type | **Rolling per-Scene revisions** (coalesced after idle interval) in Phase 1B; **action-based project-wide snapshots** for destructive operations |
| 11 | Model pricing | **User-entered per-model pricing metadata** in Settings |
| 12 | Staging multi-model per character | **Phase 5** |
| 13 | Internal links in editor | **Styled chips in editor; stripped in export** |
| 14 | Backup warning cadence | **7 days default** (configurable) |
| 15 | PWA | **Phase 3** |
| 16 | GitHub Pages routing | **Hash routing** (`/#/writing/...`) — brutally reliable on static hosting; no server fallback needed; Vite `base` configured for repository subpath |
| 17 | Library versions | **Current stable compatible versions** pinned in package.json at project init; no deliberate use of outdated majors |
| 18 | Cross-tab write access | **Single-writer project lock** via `navigator.locks`; second tab opens as read-only with visible notice |
| 19 | Import validation | **Transactional**: validate manifest → schema version → object integrity → referenced assets → size limits; then commit atomically. UUID collision: offer import-as-copy (remapped IDs) or cancel. Never partial-import. |

---

## Technology Stack

| Layer | Choice |
|---|---|
| Framework | **Vite + React** (current stable) |
| Language | **TypeScript** |
| Rich Text | **TipTap** (current stable) |
| Persistence | **Dexie.js** (IndexedDB wrapper, migration support) |
| Charts | **Recharts** |
| ZIP / Export | **JSZip** (binary mode) |
| Styling | **Vanilla CSS + CSS custom properties** |
| Routing | **React Router** (current stable, hash mode) |
| Testing | **Vitest** (unit/integration) + **Playwright** (E2E) |
| CI | **GitHub Actions** — typecheck + test + production build on every push |

---

## Phase 0 — CORS Spike & GitHub Pages Validation

**Goal:** Prove the fundamental architectural assumption before writing a line of product code.

> [!IMPORTANT]
> The entire "static BYOK, no backend" model depends on the Chutes inference endpoint accepting browser requests from a GitHub Pages origin. CORS failures here invalidate the architecture. Discover this in a day, not months.

### Deliverables
- Minimal Vite + TypeScript page deployed to the **actual GitHub Pages origin** (not localhost)
- One hard-coded cheap Chutes model call with a user-supplied API key
- Confirm: HTTP 200 and response body arrive in the browser without CORS errors
- Confirm: hash-routed URL like `/#/test` opens and refreshes without 404
- Vite `base` correctly set for the repository subpath

### Acceptance Gate
- ✅ Chutes responds successfully from the GitHub Pages origin
- ✅ Nested hash route survives a hard refresh

**If CORS fails:** Architecture requires either a thin proxy (Cloudflare Worker, etc.) or a different provider. Remaining phases do not begin until this is resolved.

---

## Phase 1A — Persistence Vertical Slice

**Goal:** Prove the data layer before any UI beyond the minimum shell.

### Deliverables

#### Database & Schema
- `src/db/schema.ts` — Dexie schema: Project, Series, Book, Act, Chapter, Scene, BibleEntry, FieldValue, Relationship, Asset, Prompt, AIModel, StagingSession, Occurrence, Snapshot, SceneRevision
- `src/db/migrations.ts` — versioned migration runner (MIG-001 → MIG-006)
- Schema version embedded in every persisted project

#### Bible FieldValue Model

Each Bible Entry field stores independently addressable `FieldValue` records — not a flat JSON blob:

```
FieldValue {
  id:         uuid
  entryId:    uuid
  fieldKey:   string                 // "eye_color", "occupation", etc.
  value:      string | ...
  state:      Planned | Drafted | Canon | Retconned | Discarded
  validFrom:  NarrativePosition | null   // Book/Chapter/Scene ref
  validUntil: NarrativePosition | null
  provenance: SceneRef[]
  createdAt:  timestamp
  updatedAt:  timestamp
}
```

A Character can simultaneously have canonical eye colour, a planned Book 3 injury, and a retconned former occupation as separate rows — each independently queryable.

#### Cross-Tab Write Lock
- On project open: acquire `navigator.locks` write lock scoped to that project UUID
- Second tab attempting to open the same project: shown "Already open for editing in another tab — this tab is read-only"
- Lock released on tab/project close

#### Automated Test Suite — Day One

**Vitest** unit tests:
- Schema migration paths
- FieldValue queries, state filtering
- ID stability after rename
- Trash restore
- Import validation rejection

**Playwright** E2E tests:
- Rich-text save/reload (formatting persists after page reload)
- Export → delete project → import (all data returns, no API key)
- Schema migration (load v1 fixture, verify forward migration)
- Stable IDs after rename and drag-reorder
- Trash restore
- Corrupted/malformed import rejected, database unchanged
- Hash route hard-refresh (nested route does not 404)

**GitHub Actions** CI: typecheck → Vitest → Playwright → production build on every push to `main`

### Acceptance Gate
- All Vitest and Playwright tests pass
- `npm run build` succeeds cleanly
- GitHub Actions green on push

---

## Phase 1B — Writing Environment

**Goal:** Complete scene editor, hierarchy, planning, autosave, rolling revisions.

### Deliverables

#### Core Hierarchy (CORE-001 → CORE-012)
- Series > Book > (optional Act) > Chapter > Scene
- UUID on all entities; display names editable without changing IDs
- Drag-and-drop reordering via `@dnd-kit`, preserving internal references
- ID-stability Playwright test runs after every reorder

#### Writing Workspace (WRITE-001 → WRITE-061)
- TipTap editor: Bold, Italic, Underline, Strikethrough, Headings, Lists, Blockquote, HRule, Hyperlinks, Superscript, Subscript
- Standard keyboard shortcuts (Ctrl+B/I/U/Z/Y, Ctrl+F, Ctrl+A, etc.)
- Live word count, Find & Replace
- Scene metadata: POV, Location, Status, Word Count, Notes
- Configurable writing statuses
- Focus / distraction-free mode (WRITE-060, WRITE-061)

#### Rolling Scene Revisions
- After meaningful editing pause (idle ~60 s, configurable): coalesce edits into a `SceneRevision` record
- Retain: last 50 revisions per scene, pruned beyond 30 days
- Revision browser: view, diff, restore any revision
- Protects against "autosave persisted a broken state" and "didn't notice until tomorrow"

#### Autosave (PORT-010)
- Continuous save to IndexedDB; UI shows "Saved" indicator

#### Planning Workspace — Basic (PLAN-001 → PLAN-007)
- Rich-text planning at Series, Book, Act, Chapter, Scene levels
- Suggested field labels from spec § 10.1

#### Application Shell
- 8-workspace hash-routed sidebar
- Dark / light mode (UI-001)
- Font, size, line-spacing, content-width preferences (UI-002 → UI-006)
- Persistent storage request on first load (ARCH-014)
- Storage usage display (PROJ-005, ARCH-015)

### New Playwright Tests
- Scene revision: write → idle → write → restore earlier revision
- Focus mode: non-editor UI elements hidden
- Reorder scenes: IDs stable, compilation order matches visual order

---

## Phase 1C — Portability & Safety

**Goal:** Robust project lifecycle: create, duplicate, Trash, export, import.

### Deliverables

#### Project Management (PROJ-001 → PROJ-007)
- New / Open / Rename / Duplicate / Delete (to Trash)
- Trash with full restore (SAFE-003, SAFE-004)
- Project dashboard: last modified, storage usage, last export date

#### Project Export — `.storyproject` ZIP
- `manifest.json` · `database.json` · `assets/<uuid>.<ext>` (binary files, never Base64)
- `database.json` references assets by UUID only
- Credentials excluded by default (PORT-003)

#### Project Import — Transactional Validation
1. Parse ZIP, read `manifest.json`
2. Validate schema version (reject if ahead of app)
3. Validate all `database.json` object integrity (required fields, valid UUID formats)
4. Validate all referenced asset UUIDs exist in `assets/`
5. Enforce archive size limit (default 2 GB)
6. UUID collision check → offer **Import as copy** (all IDs remapped) or **Cancel**
7. Only after all validation: write to IndexedDB atomically
8. On any failure: database left completely unchanged

#### Action-Based Project Snapshots (PORT-011 → PORT-015)
- Auto-snapshot before: bulk delete, chapter delete, project overwrite, migration
- Manual snapshot trigger
- 7-day backup cadence warning
- Snapshot browser in Settings

### New Playwright Tests
- Full export → delete → import round trip (binary ZIP assertions)
- Import-as-copy: both projects exist independently, no shared IDs
- Malformed ZIP rejected, database unchanged
- UUID collision flow: user offered copy/cancel

---

## Phase 2 — Bible, Assets, Relationships & Search

**Goal:** Complete Bible/Codex, Asset Library, Relationships, Occurrence Index, Global Search.

### Deliverables

#### Bible/Codex (BIBLE-001 → BIBLE-014)
- BibleEntry UI over the FieldValue model defined in Phase 1A
- Built-in templates: Character, Location, Organization, Species, Culture, Item, Technology, Magic System, Ability, Historical Event, Rule, Creature, Language, Government, Religion, Plot Element, General Reference, Custom
- Custom template builder (BIBLE-005)
- Tag filtering, alias search, keyword indexing

#### Relationships (REL-001 → REL-006)
- Typed, directional or bidirectional; configurable types; optional notes
- Timeline-aware state using the same `validFrom/validUntil` model as FieldValues

#### Provenance (PROV-001 → PROV-005)
- Source references on FieldValues using stable Scene UUIDs
- Navigate from Bible fact → source scene

#### Asset Library (ASSET-001 → ASSET-042)
- Image import stored as IndexedDB Blob; exported as binary in ZIP (never Base64)
- Many-to-many asset ↔ object links with role labels
- Scoped visual references (Book/Timeline/Scene scope)
- Searchable library with filters

#### Occurrence Index (OCC-001 → OCC-006)
- Debounced dirty-scene queue → **Web Worker** processor
- Alias/keyword detection with confidence scores
- Review queue UI for ambiguous matches
- Feeds heatmaps and analytics

#### Global Search (SEARCH-001 → SEARCH-004)
- Full-text: Manuscript, Bible, Planning, Notes, Tags, Aliases, Prompts, Asset metadata
- Type-tagged results, direct navigation

#### Canon / Information State (CANON-001 → CANON-005)
- Planned / Drafted / Canon / Retconned / Discarded on FieldValues and Relations

---

## Phase 3 — AI, Prompts, Staging & PWA

**Goal:** Full AI integration, Prompt Library, Context Engine, Staging workspace, PWA.

### Deliverables

#### AI Provider Layer (AI-001 → AI-015)
- `ProviderAdapter` interface + `ChutesAdapter` (proven in Phase 0)
- BYOK: credentials stored separately, never exported; Test Connection function

#### AI Model Directory (MODEL-001 → MODEL-004)
- User-configurable model records; enable/disable per model

#### Prompt Library (PROMPT-001 → PROMPT-040)
- Four sections: General · Instructions · Inputs · Description
- `{{variable}}` template system mapped to declared Input types
- Categories, tags, enable/disable, duplication, favorites, import/export

#### AI Context Engine (CTX-001 → CTX-012)
- Assembly respecting canon state, narrative time, token budget
- Context Preview: included vs. excluded sources + token estimate
- Manual pin / exclude; omission notification

#### AI Request History (AIH-001 → AIH-004)
- Metadata always stored: prompt name, model, token count, timestamp, source object
- Full payload (context + response) optional via "metadata only" setting
- Pruned by: count (500) **and** size (50 MB) **and** age (90 days) — first limit hit prunes oldest
- Browsable, re-openable, deleteable

#### Token / Cost Tracking (COST-001 → COST-004)

#### Prompt Testing Sandbox (PTEST-001 → PTEST-006)

#### AI Safety (AI-SAFE-001 → AI-SAFE-005)
- All AI output as suggestions; explicit accept required before any project data changes

#### Staging Workspace (STAGE-001 → STAGE-082)
- Non-canon rehearsal modes: Character Interview, Voice Test, Chemistry Test, Scene Rehearsal, Alternate Take, Pressure Test, Knowledge Test, Dialogue-only, Multi-character
- Context Preview in Staging; user role selection
- Discovery capture with explicit promotion + provenance link to session
- Session archive: save, rename, delete, search; branching from any point

#### PWA (ARCH-021)
- Vite PWA plugin; offline-capable core

---

## Phase 4 — Review, Analytics & Second-Wave Features

- **Review Workspace** — word count, distribution histogram, character distribution (REVIEW-001 → REVIEW-022)
- **Bible Appearance Heatmap** — manuscript-order and narrative-chronology modes (HEAT-001 → HEAT-008)
- **Dashboard** — word count, recent items, TODOs, backup status, quick actions (DASH-001 → DASH-003)
- **Command Palette** — Ctrl+K; navigation, creation, AI invocation, search (CMD-001 → CMD-005)
- **Internal Links & Backlinks** — chips in editor, stripped in export; "Referenced by" panel (LINK-001 → LINK-005)
- **Relationship Graph** — visual node-edge view
- **Narrative Timeline View** — flashback/nonlinear chronology UI
- **DOCX Export** — formatting preserved, configurable separators (EXPORT-001 → EXPORT-004)
- **DOCX Import** — preview before apply (IMPORT-001 → IMPORT-002)
- **Selective Export** — single Book, Bible, Assets, Prompts, Planning
- **Staging Compare Mode** (STAGE-080 → STAGE-082)
- **AI Request History** — full browsable log UI

---

## Phase 5 — Advanced & Polish

- EPUB / PDF export
- Password-encrypted `.storyproject` export
- Local-model / OpenAI-compatible endpoint provider
- Advanced dialogue statistics
- Automatic contradiction surfacing
- Enhanced relationship graph; deep manuscript diffing
- Fine-grained fact provenance explorer
- Custom dashboard layouts
- Model-per-character Staging ensemble sessions
- Global cross-project prompt library
- Full accessibility audit (ACCESS-001 → ACCESS-006)

---

## Repository Structure

```
AnansiWriter/
├── .github/workflows/ci.yml       ← typecheck + vitest + playwright + build
├── public/
│   ├── manifest.json
│   └── icons/
├── e2e/                           ← Playwright tests
│   ├── write-reload.spec.ts
│   ├── export-import.spec.ts
│   ├── migration.spec.ts
│   ├── stable-ids.spec.ts
│   ├── trash-restore.spec.ts
│   ├── corrupt-import.spec.ts
│   └── hash-routing.spec.ts
├── src/
│   ├── db/
│   │   ├── schema.ts
│   │   └── migrations.ts
│   ├── services/
│   │   ├── ProjectService.ts
│   │   ├── BibleService.ts
│   │   ├── WritingService.ts
│   │   ├── PlanningService.ts
│   │   ├── AssetService.ts
│   │   ├── PromptService.ts
│   │   ├── StagingService.ts
│   │   ├── SearchService.ts
│   │   ├── ReviewService.ts
│   │   └── ai/
│   │       ├── ProviderAdapter.ts
│   │       ├── ChutesAdapter.ts
│   │       ├── ContextEngine.ts
│   │       └── UsageTracker.ts
│   ├── workers/
│   │   └── OccurrenceIndexer.worker.ts
│   ├── workspaces/
│   │   ├── Project/
│   │   ├── Bible/
│   │   ├── Planning/
│   │   ├── Writing/
│   │   ├── Staging/
│   │   ├── Review/
│   │   ├── Prompts/
│   │   └── Settings/
│   ├── components/
│   │   ├── editor/
│   │   ├── bible/
│   │   ├── assets/
│   │   ├── charts/
│   │   ├── modals/
│   │   ├── CommandPalette/
│   │   └── shared/
│   ├── hooks/
│   ├── store/
│   └── index.css
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Verification Plan

### Automated (runs on every push via GitHub Actions)

| Test | Tool | Phase |
|---|---|---|
| Typecheck | `tsc --noEmit` | 1A |
| Unit: schema migrations | Vitest | 1A |
| Unit: FieldValue queries + state | Vitest | 1A |
| Unit: ID stability after rename | Vitest | 1A |
| Unit: import validation rejection | Vitest | 1A |
| E2E: rich-text save/reload | Playwright | 1B |
| E2E: scene revision restore | Playwright | 1B |
| E2E: hash route hard refresh | Playwright | 0/1A |
| E2E: export → delete → import | Playwright | 1C |
| E2E: import-as-copy (remapped IDs) | Playwright | 1C |
| E2E: corrupt ZIP rejected, DB unchanged | Playwright | 1C |
| E2E: stable IDs after drag reorder | Playwright | 1B |
| E2E: Trash restore | Playwright | 1C |
| Production build | `npm run build` | all |

### Manual Acceptance Scenarios (spec § 51)

- **51.1** Standalone novel — no Acts required
- **51.2** Multi-book series — shared Bible, scoped state
- **51.3** Rename character — all links survive
- **51.4** Rich text — italic persists after reload; in DOCX (Phase 4)
- **51.5** AI continuity check — Context Preview correct, canon not modified
- **51.6** Future knowledge protection — Book 3 planned fact excluded from Book 1 context
- **51.7** Staging discovery — provenance links back to session
- **51.8** Staging branch — original session intact
- **51.9** Asset reuse — one binary file, linked to multiple objects
- **51.10** Heatmap — narrative chronology switch updates positions
- **51.11** Export/restore — data returns, API key absent

> [!NOTE]
> Manual and automated verification coexist from Phase 1A onward. No phase is considered complete without green CI.
