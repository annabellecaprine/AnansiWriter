# AnansiWriter Product Specification

**Document status:** Initial comprehensive specification  
**Product name:** AnansiWriter  
**Primary deployment target:** GitHub Pages  
**Primary storage model:** Local-first browser storage  
**Primary AI provider:** Chutes, with provider abstraction for future expansion  
**Primary audience:** Novelists and series writers who need manuscript authoring, world/reference management, planning, analytics, and AI-assisted exploratory tools in one local-first application

---

## 1. Product Summary

AnansiWriter is a local-first writing and story-management application for building novels and series as interconnected narrative systems rather than collections of disconnected documents.

The application combines:

- Series and novel hierarchy
- Rich manuscript writing
- Planning at multiple narrative levels
- A comprehensive Bible/Codex
- Media and image references
- Timeline-aware story state
- Searchable prompt configuration
- Multi-model AI assistance through Chutes
- A non-canon AI staging environment for character and scene testing
- Review analytics, heatmaps, and distribution views
- Local-first persistence, export, recovery, and portability

AnansiWriter should support a single standalone novel and a long-running multi-book series using the same data model. A standalone novel is treated as a series containing one book.

The system should reduce or eliminate the need for sprawling combinations of spreadsheets, separate reference documents, loose images, prompt collections, and disconnected writing files.

---

## 2. Product Philosophy

### 2.1 Story database with a manuscript attached

AnansiWriter should treat the novel as a network of evolving story information that produces a manuscript.

The manuscript is not separate from the story model. Planning, Bible entries, media, timeline information, AI context, analytics, and writing should all reference the same underlying objects.

### 2.2 Local-first by default

The application itself may be publicly hosted, but project data remains local to the user's device unless the user explicitly exports, imports, or transmits selected context to an AI provider.

The hosting service should not require:

- User accounts
- Central manuscript storage
- A centralized application database
- Server-side project persistence

### 2.3 Human-controlled canon

AI may analyze, suggest, test, transform, or explore. AI must not silently change canon, overwrite prose, or promote exploratory material into project data without an explicit user action.

### 2.4 Flexible, not prescriptive

The application should support structured planning and structured Bible entries without forcing every author into the same story methodology.

Templates, fields, statuses, and categories should be configurable wherever practical.

### 2.5 Stable references

Major entities should have immutable internal IDs so renaming a scene, character, location, or chapter does not break internal links, analytics, or AI references.

### 2.6 Offline-capable core

The core project experience should remain usable without network access after the application is loaded or installed.

AI features may require network access.

---

# 3. High-Level Information Architecture

The primary workspaces should be:

1. **Project**
2. **Bible**
3. **Planning**
4. **Writing**
5. **Staging**
6. **Review**
7. **Prompts**
8. **Settings**

A global command/search interface should provide fast access across all major systems.

Suggested primary navigation:

```text
Project
Bible
Planning
Writing
Staging
Review
Prompts
Settings
```

---

# 4. Core Hierarchy

## 4.1 Story hierarchy

The canonical narrative hierarchy is:

```text
Series
└── Book
    └── Act
        └── Chapter
            └── Scene
```

### CORE-001
The application shall support one or more Series.

### CORE-002
Each Series shall contain one or more Books.

### CORE-003
A standalone novel shall be represented as a Series containing one Book.

### CORE-004
Books shall support optional Acts.

### CORE-005
Acts shall contain Chapters.

### CORE-006
Chapters shall contain Scenes.

### CORE-007
The system shall allow authors to work without explicit Acts.

### CORE-008
Scene shall be the fundamental manuscript writing unit unless future configuration provides another compatible internal representation.

### CORE-009
All hierarchy objects shall have immutable internal IDs.

### CORE-010
All hierarchy labels and display names shall remain editable without changing the immutable internal IDs.

### CORE-011
Books, Acts, Chapters, and Scenes shall support drag-and-drop reordering.

### CORE-012
Moving a hierarchy object shall preserve its internal references and metadata.

---

# 5. Project Management

## 5.1 Project concept

A project should normally represent one Series and all associated data.

A project may include:

- Series metadata
- Books
- Acts
- Chapters
- Scenes
- Bible entries
- Relationships
- Media assets
- Planning content
- Writing content
- Review indexes
- Prompt assignments
- Project-specific AI settings
- Staging sessions
- Notes
- Project templates
- Timeline information

### PROJ-001
The application shall allow creation of a new project.

### PROJ-002
The application shall allow opening an existing local project.

### PROJ-003
The application shall allow renaming a project.

### PROJ-004
The application shall support project duplication.

### PROJ-005
The application shall display project metadata including last modified date and approximate local storage usage.

### PROJ-006
The application shall support project export and import.

### PROJ-007
The application shall support safe project deletion through a recoverable Trash or confirmation workflow.

---

# 6. Local-First Architecture

## 6.1 Deployment

AnansiWriter is intended to run as a static web application hosted on GitHub Pages.

### ARCH-001
The production application shall be deployable as static HTML, CSS, and JavaScript assets.

### ARCH-002
Core functionality shall not require an application server.

### ARCH-003
The application shall not require user authentication for normal local use.

### ARCH-004
The application shall not depend on a central database for project persistence.

### ARCH-005
The application architecture should allow the project to be hosted on GitHub Pages, another static host, or run locally.

---

## 6.2 Local persistence

IndexedDB is the preferred initial persistence implementation for structured project data.

### ARCH-010
The primary project store shall use browser storage suitable for large structured datasets.

### ARCH-011
LocalStorage shall not be used as the primary manuscript or project database.

### ARCH-012
The persistence layer shall be abstracted behind a storage service or repository layer so the backing implementation can change later.

### ARCH-013
The storage system shall support large text volumes and binary assets.

### ARCH-014
The application should request persistent browser storage where supported.

### ARCH-015
The application shall expose storage usage information to the user.

---

## 6.3 Offline use

### ARCH-020
Once loaded or installed, the core application should support offline access.

Offline-capable functions should include:

- Writing
- Bible
- Planning
- Review
- Search
- Media viewing
- Project export
- Project import
- Staging session history
- Prompt configuration

AI inference may be unavailable offline.

### ARCH-021
The architecture should support Progressive Web App installation in a later or initial release.

---

# 7. Project Portability and Backup

## 7.1 Project package

An entire Series should be exportable as a single portable project package.

Suggested extension:

```text
.storyproject
```

The format may internally use ZIP or another structured archive.

Suggested internal structure:

```text
manifest.json
database.json
assets/
snapshots/
```

### PORT-001
The application shall support full project export.

### PORT-002
Full project export shall include all project-owned manuscript, Bible, planning, media, staging, prompt, metadata, and relationship data.

### PORT-003
Project exports shall not include API credentials by default.

### PORT-004
The user must explicitly opt in before secrets or provider credentials are included in any export.

### PORT-005
Project files shall not depend on the URL or hostname where they were created.

### PORT-006
A project exported from one deployment should be importable by another compatible deployment.

---

## 7.2 Selective export

The architecture should support selective export of:

- Full Series
- Single Book
- Bible
- Prompt Library
- Templates
- Assets
- Planning data
- Staging sessions

Selective export may be implemented after full-project export.

---

## 7.3 Backup and recovery

### PORT-010
The application shall autosave project changes.

### PORT-011
The application shall maintain recovery snapshots or equivalent version checkpoints where practical.

### PORT-012
The application shall provide manual backup export.

### PORT-013
The application should track the last successful project backup/export date.

### PORT-014
The application may warn users when a project has not been backed up for a configurable period.

### PORT-015
The application shall avoid destructive schema migrations without creating a recovery point first.

---

# 8. Schema Versioning and Migration

### MIG-001
Every persisted project shall include a schema version.

### MIG-002
Application updates shall detect older project schema versions.

### MIG-003
The application shall migrate compatible older schemas forward.

### MIG-004
Migrations shall preserve user data unless the user explicitly approves destructive changes.

### MIG-005
Before a risky migration, the application shall create or recommend a backup snapshot.

### MIG-006
Migration failures shall leave the original project recoverable.

---

# 9. Writing Workspace

## 9.1 General purpose

Writing must be a complete manuscript authoring environment, not a plain-text field.

The editor should behave like familiar desktop writing software.

### WRITE-001
The Writing workspace shall use a rich-text editor.

### WRITE-002
The editor shall support standard formatting shortcuts.

At minimum:

- Ctrl+B for Bold
- Ctrl+I for Italic
- Ctrl+U for Underline
- Ctrl+Z for Undo
- Ctrl+Y or Ctrl+Shift+Z for Redo
- Ctrl+F for Find
- Ctrl+A for Select All
- Ctrl+C for Copy
- Ctrl+V for Paste
- Ctrl+X for Cut

Mac equivalents may be supported later or automatically through browser conventions.

### WRITE-003
The editor shall support bold.

### WRITE-004
The editor shall support italic.

### WRITE-005
The editor shall support underline.

### WRITE-006
The editor shall support strikethrough.

### WRITE-007
The editor shall support paragraph styles.

### WRITE-008
The editor shall support headings.

### WRITE-009
The editor shall support numbered lists.

### WRITE-010
The editor shall support bulleted lists.

### WRITE-011
The editor shall support block quotes.

### WRITE-012
The editor shall support horizontal rules or scene-break markers.

### WRITE-013
The editor shall support hyperlinks.

### WRITE-014
The editor should support superscript and subscript.

### WRITE-015
The editor shall support safe copy/paste behavior with sensible formatting cleanup.

### WRITE-016
The editor should support smart quotes and typographic punctuation options.

### WRITE-017
The editor shall provide live word count.

### WRITE-018
The editor shall support find and replace.

---

## 9.2 Structured manuscript model

The writing system should store structure in a form safer than uncontrolled HTML where practical.

Preferred conceptual model:

```text
Document
  Block
    type
    attributes
    InlineSpan
      text
      marks
```

### WRITE-020
Formatting shall be represented structurally enough to support reliable export, analysis, AI selection, revision comparison, and manuscript compilation.

### WRITE-021
The system should distinguish inline formatting from block or paragraph styles.

### WRITE-022
The manuscript shall preserve rich formatting during save, load, export, and restore.

---

## 9.3 Scene-centric editing

### WRITE-030
Each Scene shall have an associated writing document.

### WRITE-031
The system shall compile Chapter text from its Scenes in narrative order.

### WRITE-032
The system shall compile Book text from its Chapters in narrative order.

### WRITE-033
Scenes shall support titles or working names.

### WRITE-034
Scenes shall support metadata including:

- POV
- Location
- Timeline placement
- Status
- Word count
- Referenced Bible entries
- Notes

### WRITE-035
The scene metadata model shall be extensible.

---

## 9.4 Writing statuses

Default examples:

```text
Planned
Drafting
First Draft
Revision
Final
```

### WRITE-040
Writing statuses shall be configurable.

### WRITE-041
Scenes shall support status assignment.

### WRITE-042
Chapters and Books should derive or store summary status information.

---

## 9.5 Notes and comments

### WRITE-050
Authors shall be able to attach non-manuscript notes to Scenes.

### WRITE-051
Notes shall not appear in manuscript export unless explicitly selected.

### WRITE-052
The system should support TODO or revision flags.

### WRITE-053
The system should support inline comments or anchored notes in a later release.

---

## 9.6 Focus mode

### WRITE-060
The application should provide a distraction-reduced writing mode.

Focus mode may hide:

- Navigation panels
- Metadata
- Analytics
- Bible sidebars
- Nonessential controls

### WRITE-061
Focus mode shall preserve normal editor shortcuts.

---

# 10. Planning Workspace

Planning mirrors the narrative hierarchy.

```text
Series
Book
Act
Chapter
Scene
```

### PLAN-001
The application shall support Series-level planning.

### PLAN-002
The application shall support Book-level planning.

### PLAN-003
The application shall support Act-level planning.

### PLAN-004
The application shall support Chapter-level planning.

### PLAN-005
The application shall support Scene-level planning.

### PLAN-006
Planning fields shall be configurable or template-driven.

### PLAN-007
Planning shall remain distinct from canon.

---

## 10.1 Suggested planning fields

These fields are examples, not mandatory hard-coded requirements.

### Series planning

- Premise
- Series-long mysteries
- Long-term character trajectories
- Themes
- Future books
- Series-level conflicts

### Book planning

- Premise
- Main conflict
- Character arcs
- Themes
- Ending state
- Major revelations

### Act planning

- Purpose
- Escalation
- Turning point
- Required developments

### Chapter planning

- Purpose
- POV
- Required information
- Emotional movement
- Major beats

### Scene planning

- POV
- Location
- Participants
- Goal
- Conflict
- Outcome
- Required beats
- Setup
- Payoff
- Notes

---

# 11. Canon and Information State

Planning and established manuscript truth must not be treated as equivalent.

Default information states:

```text
Planned
Drafted
Established / Canon
Retconned
Discarded
```

### CANON-001
The system shall distinguish planned information from established information.

### CANON-002
AI context assembly shall respect information state.

### CANON-003
Future planned information shall not automatically be supplied as known canon when analyzing earlier narrative positions.

### CANON-004
Retconned information shall remain recoverable or historically traceable.

### CANON-005
Discarded information shall be excluded from normal canon-aware context unless explicitly requested.

---

# 12. Bible / Codex

## 12.1 Core principle

Everything that represents reusable story-world information should be representable as a Bible Entry.

Rather than maintaining unrelated subsystems for characters, places, factions, and items, AnansiWriter should use a generalized Bible Entry model with templates.

### BIBLE-001
The application shall provide a Bible/Codex workspace.

### BIBLE-002
Bible Entries shall have immutable internal IDs.

### BIBLE-003
Bible Entries shall have editable display names.

### BIBLE-004
Bible Entries shall support templates/types.

### BIBLE-005
Users shall be able to create custom Bible templates.

### BIBLE-006
Bible Entries shall support tags.

### BIBLE-007
Bible Entries shall support aliases.

### BIBLE-008
Bible Entries shall support keywords.

### BIBLE-009
Tags, aliases, and keywords shall be treated as distinct concepts.

### BIBLE-010
Bible Entries shall support descriptions and structured fields.

### BIBLE-011
Bible Entries shall support attached or linked media.

### BIBLE-012
Bible Entries shall support relationships to other Bible Entries.

### BIBLE-013
Bible Entries shall support provenance or source links.

### BIBLE-014
Bible Entries shall support timeline-aware information where appropriate.

---

## 12.2 Suggested Bible templates

Initial built-in templates may include:

- Character
- Location
- Organization
- Species
- Culture
- Item
- Technology
- Magic system
- Ability
- Historical Event
- Rule
- Creature
- Language
- Government
- Religion
- Custom
- Plot Element
- General Reference

Users should be able to add additional templates.

---

## 12.3 Character template examples

Possible fields:

- Full name
- Aliases
- Description
- Appearance
- Personality
- Abilities
- Occupation
- Relationships
- Knowledge
- Possessions
- Current status
- History
- Notes

---

## 12.4 Location template examples

Possible fields:

- Name
- Location type
- Parent location
- Description
- Residents
- Important features
- History
- Associated organizations
- Map
- Images

---

# 13. Tags, Aliases, and Keywords

## 13.1 Tags

Tags organize information for the author.

Examples:

```text
Book 2
Antagonist
Supernatural
Bracken Ridge
Needs Review
```

## 13.2 Aliases

Aliases identify textual names that refer directly to an entity.

Example:

```text
Elizabeth Mercer
Liz
Beth
Detective Mercer
Mercer
```

## 13.3 Keywords

Keywords identify semantically associated concepts that may help search, indexing, AI context, or heatmap detection.

Example:

```text
Special Affairs Division
werewolf investigation
traffic camera
police station
```

### INDEX-001
Tags shall support filtering.

### INDEX-002
Aliases shall support entry detection and search.

### INDEX-003
Keywords shall support contextual search and future appearance mapping.

### INDEX-004
The application shall avoid assuming every keyword occurrence is necessarily a direct entity mention.

---

# 14. Relationships

Relationships connect Bible entries.

Examples:

```text
Elizabeth Mercer
  MEMBER OF -> Special Affairs Division
  LIVES IN -> Bracken Ridge
  SISTER OF -> Melissa Mercer
  OWNS -> Ford Bronco
```

### REL-001
Bible Entries shall support typed relationships.

### REL-002
Relationships may be directional or bidirectional.

### REL-003
Relationship types shall be configurable.

### REL-004
Relationships shall support optional notes.

### REL-005
Relationships should support timeline-aware state.

### REL-006
Relationship changes over time shall not require destroying earlier states.

---

# 15. Timeline-Aware State

Some information changes during a story.

Examples:

- Relationship status
- Injuries
- Abilities
- Knowledge
- Possessions
- Occupation
- Residence
- Alliances
- Physical appearance
- Political or organizational status
- Alive/dead/missing state

### TIME-001
The data model shall permit values that vary by narrative time.

### TIME-002
Timeline-aware fields shall support a valid-from and/or valid-until narrative range.

### TIME-003
The system shall support book-level and scene-level effective state where practical.

### TIME-004
AI context assembly shall prefer the state valid at the target narrative point.

### TIME-005
The system shall avoid requiring every field to be timeline-aware.

---

# 16. Provenance and Source Tracking

A fact should be able to identify where it came from.

Example:

```text
Fact: Elizabeth hates coffee.
Established:
Book 1
Chapter 3
Scene 2
```

### PROV-001
Bible facts should be able to reference manuscript sources.

### PROV-002
Source references shall use stable internal IDs.

### PROV-003
The UI should allow navigation from a Bible fact to its source scene.

### PROV-004
The application should support multiple supporting sources for a fact.

### PROV-005
AI-generated suggestions shall not automatically become provenance-backed canon.

---

# 17. Media and Asset Library

## 17.1 Core principle

Images and other reference media should live inside the project ecosystem rather than in unrelated folders.

Initial priority is image support.

Possible asset types:

- Character portraits
- Maps
- Floor plans
- Reference art
- Diagrams
- Heraldry
- Symbols
- Covers
- Screenshots
- Visual notes

Future-compatible types may include:

- PDF
- Audio
- Video

### ASSET-001
The application shall support image storage.

### ASSET-002
Images shall be first-class project assets.

### ASSET-003
Assets shall have immutable IDs.

### ASSET-004
Assets shall support names.

### ASSET-005
Assets shall support descriptions.

### ASSET-006
Assets shall support captions.

### ASSET-007
Assets shall support tags.

### ASSET-008
Assets should support alt text.

### ASSET-009
Assets should support provenance and source notes.

### ASSET-010
Assets shall support many-to-many links to project objects.

---

## 17.2 Asset linking

One asset may be linked to multiple objects without duplicating the underlying file.

Example:

```text
bracken_ridge_map.png
  linked to:
    Bracken Ridge
    Old Mill
    Chapter 4 plan
```

### ASSET-020
Linking an asset to multiple objects shall not duplicate asset storage.

### ASSET-021
Objects may designate a primary image.

### ASSET-022
Objects may also maintain galleries.

### ASSET-023
Asset links should support optional role labels.

Example roles:

- Primary portrait
- Alternate portrait
- Outfit reference
- Exterior
- Interior
- Map
- Floor plan
- Mood reference

---

## 17.3 Asset scope

An asset relationship may be scoped by:

- Series
- Book
- Timeline range
- Scene

This is useful when character appearance changes over time.

### ASSET-030
The data model should support scoped visual references.

### ASSET-031
AI context assembly should prefer assets valid for the target narrative period.

---

## 17.4 Asset Library interface

### ASSET-040
The application shall provide a searchable Asset Library.

Suggested filters:

- Series
- Book
- Asset type
- Tags
- Linked Bible Entry
- Unlinked assets

### ASSET-041
The system should identify unlinked assets.

### ASSET-042
Assets should display storage size and metadata.

---

# 18. AI Provider Architecture

## 18.1 Chutes

Chutes is the initial AI provider.

### AI-001
The application shall support Chutes.

### AI-002
The AI provider layer shall be abstracted so future providers can be added.

Possible future providers:

- Other hosted APIs
- Local inference endpoints
- User-defined OpenAI-compatible endpoints

### AI-003
Provider-specific logic shall not be deeply coupled to manuscript, Bible, or prompt storage.

---

## 18.2 Bring Your Own Key

Because AnansiWriter is intended for static hosting, credentials must be user-provided.

### AI-010
Users shall be able to enter their own Chutes API credentials.

### AI-011
Credentials shall be stored separately from project content.

### AI-012
Credentials shall remain local to the user's device.

### AI-013
Credentials shall not be included in normal project exports.

### AI-014
The UI shall explain that browser-stored API credentials are local but cannot be treated as server-side secrets.

### AI-015
The system shall provide a Test Connection function.

---

# 19. AI Model Directory

The application should support multiple models.

### MODEL-001
Users shall be able to configure multiple AI models.

A model record may include:

- Display name
- Provider
- Provider model ID
- Context window
- Default temperature
- Default max output
- Supported parameters
- Vision capability
- Enabled/disabled
- Notes
- Category

### MODEL-002
Models shall be independently enabled or disabled.

### MODEL-003
Models may have categories or user-defined tags.

Examples:

- General writing
- Analysis
- Fast/cheap
- Long context
- Editing
- Brainstorming

### MODEL-004
Prompts shall reference models rather than models owning prompts.

---

# 20. Prompts Workspace

## 20.1 Prompt library

Prompts are configurable project or application resources.

### PROMPT-001
The application shall provide a searchable prompt directory.

### PROMPT-002
Prompts shall support categories.

### PROMPT-003
Prompts shall support tags.

### PROMPT-004
Prompts shall support enabled/disabled state.

### PROMPT-005
Prompts shall support duplication.

### PROMPT-006
Prompts should support import/export.

### PROMPT-007
Prompts may support favorites.

### PROMPT-008
Prompt version history should be supported in a later release.

---

## 20.2 Prompt configuration tabs

Each prompt should have four primary configuration sections:

1. General
2. Instructions
3. Inputs
4. Description

---

## 20.3 General tab

The General tab may include:

- Name
- Category
- Tags
- Enabled state
- Default model
- Allowed models
- Temperature
- Max output tokens
- Model-specific parameter overrides

### PROMPT-010
Each prompt shall have a name.

### PROMPT-011
Each prompt shall specify at least one compatible model or model-selection rule.

### PROMPT-012
Each prompt shall support inference settings.

### PROMPT-013
Prompts should allow model-specific overrides.

---

## 20.4 Instructions tab

This contains the actual system or task instructions.

### PROMPT-020
Each prompt shall support editable instructions.

### PROMPT-021
Prompt instructions should support variables/placeholders.

Example variables:

```text
{{scene}}
{{chapter_summary}}
{{character_entries}}
{{previous_scene}}
{{series_timeline}}
```

### PROMPT-022
Prompt variables should correspond to defined Inputs rather than uncontrolled magic strings where possible.

---

## 20.5 Inputs tab

Inputs define what data a prompt can consume.

Possible inputs include:

- Current selection
- Current Scene
- Current Chapter
- Current Book
- Previous Scene
- Previous N Scenes
- Bible Entries
- Character state
- Relationship state
- Timeline events
- Planning notes
- Images
- Location map
- Style guide
- User-selected additional context

### PROMPT-030
Each prompt shall declare its supported input types.

### PROMPT-031
Inputs may be required or optional.

### PROMPT-032
Inputs may be automatic or user-selected.

### PROMPT-033
Inputs may have maximum entry counts.

### PROMPT-034
Inputs may have recency rules.

### PROMPT-035
Inputs may have token budget rules.

---

## 20.6 Description tab

The Description tab acts as the prompt manual page.

Suggested contents:

- What the prompt does
- When to use it
- Inputs consumed
- Expected output
- Limitations
- Good use cases
- Risks or caveats

### PROMPT-040
Every prompt shall support a human-readable description.

---

# 21. AI Context Engine

The Context Engine assembles only the relevant project data for a given request.

### CTX-001
AI requests shall not automatically send the entire project.

### CTX-002
The Context Engine shall use prompt Input configuration.

### CTX-003
The Context Engine shall respect canon state.

### CTX-004
The Context Engine shall respect narrative time.

### CTX-005
The Context Engine shall support token budgeting.

### CTX-006
The Context Engine shall estimate context size before sending.

### CTX-007
The Context Engine shall identify data omitted due to context limits.

### CTX-008
The user shall be able to manually pin additional context.

### CTX-009
The user shall be able to exclude automatically selected context.

---

## 21.1 Context Preview

Before or during an AI action, the user should be able to inspect what will be sent.

Example:

```text
Continuity Review

Sending:
✓ Scene 14
✓ Previous Scene
✓ Elizabeth Mercer
✓ Special Affairs Division
✓ Bracken Ridge
✓ Book timeline

Not sending:
○ Other manuscript scenes
○ Future planning notes
○ Future-book state
○ Images
```

### CTX-010
The application shall provide an AI Context Preview.

### CTX-011
The Context Preview shall distinguish included and excluded sources.

### CTX-012
The Context Preview should expose estimated token usage.

---

# 22. AI Safety and Manuscript Protection

### AI-SAFE-001
AI output shall never silently overwrite manuscript text.

### AI-SAFE-002
AI output shall never silently overwrite Bible facts.

### AI-SAFE-003
AI output shall never silently promote Staging discoveries to canon.

### AI-SAFE-004
AI-generated edits should be presented as suggestions, alternatives, diffs, or explicit replacements.

### AI-SAFE-005
The user must explicitly approve changes before project data is modified.

---

# 23. AI Request History

### AIH-001
The application should maintain a local AI request history.

Each request record may include:

- Prompt used
- Prompt version or snapshot
- Model
- Provider
- Temperature
- Relevant parameters
- Context summary
- Token estimate
- Response
- Timestamp
- Source object
- User action resulting from response

### AIH-002
Request history shall remain project-local unless exported.

### AIH-003
The user shall be able to delete request history.

### AIH-004
The user should be able to reopen prior AI responses.

---

# 24. AI Token and Cost Tracking

### COST-001
The application should track request token counts when the provider returns usage data.

### COST-002
The application should estimate token usage when exact usage data is unavailable.

### COST-003
The application should allow cost summaries by:

- Request
- Session
- Model
- Book
- Project

### COST-004
Cost information may be approximate if provider pricing or usage data is incomplete.

---

# 25. Prompt Testing Sandbox

### PTEST-001
The application should provide a prompt testing interface.

### PTEST-002
Prompt testing shall not modify manuscript or Bible data by default.

### PTEST-003
The user shall be able to select sample context.

### PTEST-004
The user should be able to compare prompts.

### PTEST-005
The user should be able to compare models.

### PTEST-006
The user should be able to compare parameter settings such as temperature.

---

# 26. Staging Workspace

## 26.1 Purpose

Staging is a dedicated non-canon AI rehearsal environment.

It is an advanced version of a character voice-test environment and may be used to:

- Interview characters
- Test voice
- Test characterization
- Test chemistry
- Rehearse scenes
- Explore alternate reactions
- Pressure-test character behavior
- Probe knowledge boundaries
- Compare model behavior

### STAGE-001
The application shall provide a dedicated Staging workspace.

### STAGE-002
Staging shall be explicitly non-canon by default.

### STAGE-003
Nothing created in Staging shall alter project canon without explicit user promotion.

---

## 26.2 Staging context

The user shall be able to load:

- One or more Characters
- Scene
- Planned Scene
- Location
- Bible Entries
- Relationship data
- Timeline state
- Book context
- Act context
- Chapter context
- Custom test situation
- Images where supported

### STAGE-010
The user shall be able to add and remove context sources before or during a Staging session.

### STAGE-011
The Context Preview shall be available in Staging.

---

## 26.3 Staging modes

Initial or suggested modes:

- Character Interview
- Voice Test
- Chemistry Test
- Scene Rehearsal
- Reaction Test
- Pressure Test
- Knowledge Test
- Alternate Take
- Dialogue-only Test
- Multi-character Interaction

### STAGE-020
Staging modes shall be implemented using configurable prompts where practical.

### STAGE-021
The system shall avoid hard-coding character behavior that belongs in prompts.

---

## 26.4 User role

The user should be able to participate as:

- Author
- Narrator
- Another Character
- Unnamed interviewer
- Custom persona

### STAGE-030
Staging sessions shall support user role selection.

### STAGE-031
Staging shall support in-character and meta-aware modes.

### STAGE-032
Staging should support dialogue-only mode.

---

## 26.5 Multi-character sessions

### STAGE-040
Staging shall support multiple loaded characters.

### STAGE-041
Each character shall be clearly identified in the session.

### STAGE-042
Loaded characters may be temporarily enabled or disabled.

### STAGE-043
The system should preserve speaker attribution.

---

## 26.6 Discovery capture

During a Staging session, the user may discover useful material.

Example:

> Mara hates being thanked because she interprets gratitude as debt.

The system should allow explicit promotion actions such as:

- Save as Note
- Add to Character Bible Entry
- Add as Planned Trait
- Create Relationship Note
- Create Plot Thread
- Add to Planning
- Ignore

### STAGE-050
Staging content shall require explicit promotion before becoming project data.

### STAGE-051
Promoted content should retain provenance pointing back to the Staging session.

---

## 26.7 Staging session archive

### STAGE-060
Staging sessions shall be saveable.

### STAGE-061
Saved sessions shall be labeled non-canon/exploratory.

### STAGE-062
Saved sessions shall be searchable.

### STAGE-063
The user shall be able to rename sessions.

### STAGE-064
The user shall be able to delete sessions.

---

## 26.8 Branching

### STAGE-070
Staging conversations should support branching from an earlier point.

### STAGE-071
Branches shall preserve the original session path.

### STAGE-072
Branches shall remain non-canon until explicitly promoted.

---

## 26.9 Compare mode

Future or advanced capability:

### STAGE-080
The user should be able to run the same Staging setup against multiple models.

### STAGE-081
The user should be able to compare different prompts.

### STAGE-082
The user should be able to compare parameter configurations.

---

# 27. Review Workspace

## 27.1 Book overview

### REVIEW-001
Review shall display total Book word count prominently.

### REVIEW-002
Review shall support Book, Act, Chapter, and Scene scopes.

---

## 27.2 Word count distribution

The application should provide a histogram or comparable chart.

Views:

- Words per Scene
- Words per Chapter
- Words per Act

### REVIEW-010
Review shall visualize word distribution.

### REVIEW-011
The user shall be able to switch distribution level.

### REVIEW-012
Chart data shall be derived from the canonical manuscript order.

---

## 27.3 Character distribution

Character distribution may include:

- Scene appearances
- Chapter appearances
- POV appearances
- Mentions
- Dialogue participation in a later release
- Words associated with scenes containing the character

### REVIEW-020
Review shall provide Character distribution analytics.

### REVIEW-021
The user shall be able to filter by character.

### REVIEW-022
The user shall be able to choose the unit of distribution.

---

# 28. Bible Appearance Heatmap

The heatmap visualizes where Bible entries appear across the manuscript.

Example conceptual matrix:

```text
              Scene 1  Scene 2  Scene 3  Scene 4
Elizabeth       ██       ███              █
SAD             █         ██      ██
Mayor                     █       ███
Old Mill                          ███
```

### HEAT-001
Review shall provide a Bible Entry appearance heatmap.

### HEAT-002
The heatmap shall support Book scope.

### HEAT-003
The heatmap should support Act scope.

### HEAT-004
The heatmap should support Chapter scope.

### HEAT-005
The heatmap shall support filtering by Bible Entry type or tag.

### HEAT-006
The heatmap shall support occurrence-count mode.

### HEAT-007
The heatmap shall support narrative-timeline mode.

### HEAT-008
The heatmap shall distinguish manuscript order from narrative chronology where those differ.

---

# 29. Occurrence Index

The system needs an internal index connecting manuscript text with Bible entries.

### OCC-001
Bible entry occurrences shall reference immutable Bible Entry IDs.

### OCC-002
The system shall support direct occurrence links.

### OCC-003
The system should support automatic candidate detection using aliases and keywords.

### OCC-004
Automatic detection shall be reviewable where ambiguity exists.

### OCC-005
The occurrence index shall feed heatmaps and analytics.

### OCC-006
Renaming a Bible Entry shall not destroy existing occurrence references.

---

# 30. Continuity and Analysis Prompts

These should normally be implemented as configurable Prompts.

Suggested tools:

- Continuity Check
- Knowledge Check
- Character Check
- Thread Check
- Repetition Check
- Setup/Payoff Check
- Timeline Check
- Relationship Check
- Location Consistency Check

### CONT-001
Continuity tools shall use project data rather than isolated plain-text prompts where possible.

### CONT-002
Continuity results shall identify supporting source material when available.

### CONT-003
Continuity tools shall not automatically modify canon.

---

# 31. Search

## 31.1 Global search

### SEARCH-001
The application shall provide global search.

Searchable sources should include:

- Manuscript
- Planning
- Bible
- Tags
- Aliases
- Keywords
- Prompts
- Notes
- Staging sessions
- Assets by metadata

### SEARCH-002
Search results shall identify object type.

### SEARCH-003
Search results shall navigate directly to the matching object.

### SEARCH-004
Search shall support filtering by source type.

---

# 32. Command Palette

A universal command palette should provide keyboard-first navigation.

Suggested shortcut:

```text
Ctrl+K
```

Possible commands:

```text
Open Elizabeth Mercer
Go to Book 2 > Chapter 7
Create Scene
Search "traffic cameras"
Run Continuity Check
Open Prompts
Insert Bible Link
Switch Book
```

### CMD-001
The application should provide a global command palette.

### CMD-002
The command palette shall support navigation.

### CMD-003
The command palette should support object creation.

### CMD-004
The command palette should support invoking configured AI prompts.

### CMD-005
The command palette should support search.

---

# 33. Internal Linking and Backlinks

### LINK-001
Project objects shall support internal links to other project objects.

### LINK-002
Internal links shall reference immutable IDs.

### LINK-003
Renaming linked objects shall not break links.

### LINK-004
Objects should expose backlinks or "Referenced by" information.

### LINK-005
The writing editor should support inserting internal Bible links without forcing them into exported manuscript output.

---

# 34. Dashboard

A project dashboard may provide:

- Current Book
- Total word count
- Recent Scenes
- Recent Bible entries
- Unresolved TODOs
- Writing progress
- Recent Staging sessions
- Backup status
- Quick actions

### DASH-001
The application should provide a project dashboard.

### DASH-002
Dashboard widgets should be concise and navigable.

### DASH-003
Dashboard content should avoid duplicating the full Review workspace.

---

# 35. Status and Workflow System

The application should support configurable statuses across major object types.

Examples:

- Planned
- Drafting
- Needs Review
- Revised
- Final
- Archived

### FLOW-001
Statuses shall be configurable.

### FLOW-002
Statuses may differ by object type.

### FLOW-003
Status colors or icons may be configurable.

### FLOW-004
Status filtering shall be supported in relevant lists.

---

# 36. Undo, Recovery, and Trash

### SAFE-001
Writing shall support normal undo/redo.

### SAFE-002
Structural actions such as moving Scenes should be undoable where practical.

### SAFE-003
Destructive deletion shall require confirmation or use a Trash system.

### SAFE-004
Trash items should remain recoverable until permanently deleted.

### SAFE-005
Bulk changes should provide a recovery path when practical.

---

# 37. Duplicate and Clone Operations

### DUP-001
The user should be able to duplicate Scenes.

### DUP-002
The user should be able to duplicate Books.

### DUP-003
The user should be able to duplicate Bible Entries.

### DUP-004
The user should be able to duplicate templates.

### DUP-005
The user should be able to duplicate Prompts.

---

# 38. Import and Export Formats

## 38.1 Project backup

Primary portable project format:

```text
.storyproject
```

## 38.2 Manuscript export

The system should support export to:

- Markdown
- Plain text
- DOCX

Future support may include:

- EPUB
- PDF

### EXPORT-001
Export shall preserve manuscript order.

### EXPORT-002
Export shall preserve supported rich formatting where the target format allows it.

### EXPORT-003
Author-only notes shall be excluded by default.

### EXPORT-004
The user should be able to configure chapter and scene separators.

---

## 38.3 Manuscript import

Future or early support should include:

- Markdown
- Plain text
- DOCX

### IMPORT-001
Imports shall not silently destroy existing project content.

### IMPORT-002
The system should provide an import preview.

---

# 39. Appearance and Editor Preferences

### UI-001
The application shall support light and dark appearance modes.

### UI-002
The writing editor shall allow font selection.

### UI-003
The writing editor shall allow font-size adjustment.

### UI-004
The writing editor shall allow line-spacing adjustment.

### UI-005
The writing editor shall allow content-width adjustment.

### UI-006
Editor appearance preferences shall not alter exported manuscript semantics unless explicitly requested.

---

# 40. Accessibility and Keyboard Navigation

### ACCESS-001
Major application features should be keyboard accessible.

### ACCESS-002
Interactive controls should use semantic HTML or equivalent accessibility semantics.

### ACCESS-003
Focus states shall be visible.

### ACCESS-004
The application should support screen readers.

### ACCESS-005
Charts should provide textual alternatives or accessible summaries.

### ACCESS-006
Users should be able to adjust text size.

---

# 41. Privacy

### PRIV-001
Project data shall remain local by default.

### PRIV-002
The application shall not require uploading manuscript content to a central AnansiWriter service.

### PRIV-003
Only context required for a chosen AI request shall be transmitted to the configured provider.

### PRIV-004
The application shall expose which context is being sent.

### PRIV-005
The project export system shall exclude provider credentials by default.

---

# 42. Optional Encryption

Encryption is not required for the first release but the architecture should not prohibit it.

Potential future capabilities:

- Password-encrypted project exports
- Encrypted local project storage
- Encrypted backups

### ENC-001
The architecture should avoid assumptions that make future encryption impractical.

---

# 43. Data Model Overview

The following is conceptual, not a required database schema.

```text
Project
  Series
    Book
      Act
        Chapter
          Scene
            Plan
            ManuscriptDocument
            Metadata

  BibleEntry
    Template
    Fields
    Tags
    Aliases
    Keywords
    Relationships
    Provenance
    TimelineValues
    AssetLinks

  Asset
    Metadata
    FileData
    Links

  Prompt
    GeneralConfig
    Instructions
    Inputs
    Description

  AIModel
    Provider
    Parameters
    Capabilities

  StagingSession
    Context
    Prompt
    Model
    Messages
    Branches
    Promotions

  Occurrence
    BibleEntryID
    SceneID
    Position
    Confidence
    SourceType

  Snapshot
  SearchIndex
  ReviewCache
```

---

# 44. Suggested Object Identity Rules

### ID-001
Every major project object shall have a UUID or equivalent stable unique ID.

Major object types include:

- Project
- Series
- Book
- Act
- Chapter
- Scene
- Bible Entry
- Relationship
- Asset
- Prompt
- Staging Session
- Timeline Event

### ID-002
Display names shall never be used as the sole relational key.

### ID-003
Internal references shall survive renames.

---

# 45. Performance Expectations

### PERF-001
The application should remain responsive with novel-length manuscripts.

### PERF-002
The application should support multi-book Series without requiring all manuscript text to remain rendered simultaneously.

### PERF-003
Large images should be handled without blocking normal writing interactions.

### PERF-004
Search and Review indexes may be cached locally.

### PERF-005
Caches shall be rebuildable from canonical project data.

### PERF-006
Analytics generation should not block typing in the editor.

---

# 46. Suggested Technical Architecture

This section describes implementation guidance rather than immutable product requirements.

A reasonable frontend architecture may include:

```text
UI Layer
  Workspaces
  Components
  Rich Text Editor
  Charts

Application Services
  Project Service
  Bible Service
  Writing Service
  Planning Service
  Asset Service
  Prompt Service
  Staging Service
  Search Service
  Review Service

AI Services
  Provider Adapter
  Chutes Adapter
  Context Engine
  Prompt Renderer
  Usage Tracker

Persistence
  Storage Repository
  IndexedDB Adapter
  Migration System
  Snapshot System

Indexes
  Full-text Search
  Occurrence Index
  Analytics Cache
```

Likely technologies may include:

- Vite
- TypeScript
- React, Vue, Svelte, or equivalent
- IndexedDB
- A mature rich-text editor framework
- A browser-compatible chart library
- Service worker/PWA tooling
- ZIP library for project packaging

The exact framework is not specified by this document.

---

# 47. Rich Text Editor Selection Criteria

Because Writing is core functionality, the editor framework should be chosen deliberately.

Selection criteria should include:

- Reliable rich text
- Keyboard shortcuts
- Structured document model
- Extensible schema
- Custom inline marks
- Custom block types
- Internal links
- Comments or annotations
- JSON serialization
- Selection-aware AI actions
- Collaborative architecture not required
- Good browser support
- Active maintenance

The implementation should avoid building a custom contentEditable editor from scratch unless there is a compelling technical reason.

---

# 48. Review and Analytics Data Philosophy

Analytics should be computed from project data and indexes rather than manually maintained duplicate fields.

### DATA-001
Canonical manuscript text shall remain the source of truth for word counts.

### DATA-002
Review analytics may use rebuildable caches.

### DATA-003
Bible appearance analytics shall derive from occurrence data.

### DATA-004
Character distribution should distinguish confirmed references from heuristic matches where applicable.

---

# 49. Non-Goals for Initial Release

To control scope, the following should not be assumed as required for MVP unless later promoted:

- Real-time multi-user collaboration
- Cloud accounts
- Central manuscript hosting
- Mobile-first editing
- Publishing marketplace
- Social networking
- Automatic book publishing
- Fully automated developmental editing
- Automatic canon mutation by AI
- Server-side AI proxy
- Live coauthoring

These may be considered later without changing the product's core philosophy.

---

# 50. Suggested MVP Boundary

A practical first usable release could include:

## Required for MVP

- Static GitHub Pages deployment
- Local project creation
- Series > Book > Chapter > Scene hierarchy
- Optional Act support
- Rich-text Scene editor
- Autosave
- Basic snapshots
- Bible Entries
- Built-in Bible templates
- Custom tags
- Aliases
- Keywords
- Image assets
- Planning hierarchy
- Basic Review word counts
- Basic character appearance tracking
- Chutes configuration
- Multiple AI models
- Prompt library
- Prompt General / Instructions / Inputs / Description
- Context Preview
- Basic Staging workspace
- Full project export/import
- Global search
- Safe deletion
- Schema versioning

## Strong second-wave features

- Relationship graphing
- Timeline-aware field values
- Provenance navigation
- Bible heatmap
- Narrative chronology view
- Staging branching
- Model comparison
- Prompt comparison
- AI request history
- Token/cost tracking
- Command palette
- DOCX export/import
- PWA installation
- Backlinks
- Custom planning templates

## Later advanced features

- EPUB/PDF export
- Encrypted projects
- More AI providers
- Local-model provider
- Advanced dialogue statistics
- Automatic contradiction surfacing
- Visual relationship graph
- Deep manuscript diffing
- Fine-grained fact provenance
- Custom dashboard layouts

This staging is guidance only. Requirements may be moved between releases.

---

# 51. Acceptance Scenarios

The following scenarios illustrate expected behavior.

## 51.1 Create a standalone novel

1. User creates a project named `The Quiet Door`.
2. System creates a Series.
3. User creates one Book.
4. User does not create Acts.
5. User creates Chapters and Scenes.
6. All features function normally.

Expected result:

A single Book works without requiring a different project type.

---

## 51.2 Create a multi-book Series

1. User creates Series `Bracken Ridge`.
2. User adds Books 1, 2, and 3.
3. Shared Bible entries remain available across Books.
4. Book-specific state is scoped where necessary.
5. Review can operate on one Book at a time or Series scope where supported.

Expected result:

Shared world information remains centralized while narrative state may evolve.

---

## 51.3 Rename a character

1. Character Bible Entry is originally `Liz Mercer`.
2. Character has dozens of internal references.
3. User renames display name to `Elizabeth Mercer`.
4. Links, occurrences, relationships, and source references continue working.

Expected result:

Renaming does not break data integrity.

---

## 51.4 Rich text writing

1. User opens a Scene.
2. User types dialogue.
3. User selects a phrase.
4. User presses Ctrl+I.
5. Phrase becomes italic.
6. User saves and reloads project.
7. Italic formatting remains.
8. Export to DOCX preserves italics.

Expected result:

Writing behaves like normal writing software.

---

## 51.5 AI continuity check

1. User selects Scene 12.
2. User runs `Continuity Check`.
3. Prompt declares:
   - Current Scene
   - Previous Scene
   - Relevant Bible Entries
   - Current timeline state
4. Context Preview shows selected data.
5. User sends request.
6. AI identifies a possible contradiction.
7. User chooses whether to act on it.

Expected result:

AI analyzes but does not modify project data.

---

## 51.6 Future knowledge protection

1. Book 3 plan states that the mayor is a vampire.
2. User runs AI analysis on Book 1 Scene 4.
3. Book 3 plan is marked Planned.
4. Context Engine excludes it unless explicitly requested.

Expected result:

The AI does not treat future planned knowledge as established Book 1 canon.

---

## 51.7 Staging character interview

1. User opens Staging.
2. User loads Character `Mara Venn`.
3. User chooses Character Interview.
4. User loads Book 2 timeline state.
5. User begins interview.
6. Mara says something interesting about gratitude.
7. User highlights the statement.
8. User chooses `Add as Planned Trait`.
9. System creates a planned Character note and links provenance to the Staging session.

Expected result:

Exploration remains non-canon until explicitly promoted.

---

## 51.8 Staging alternate branch

1. User runs a Scene Rehearsal.
2. At message 8, character responds calmly.
3. User branches message 7.
4. User asks the same situation with additional pressure.
5. New branch produces an angry response.
6. Original branch remains intact.

Expected result:

Alternate exploration does not destroy earlier testing.

---

## 51.9 Asset reuse

1. User imports a city map.
2. User links it to `Bracken Ridge`.
3. User links the same asset to `Old Mill`.
4. User links it to Chapter 4 planning.
5. Storage contains one file object.

Expected result:

One asset may be reused without duplication.

---

## 51.10 Heatmap

1. Book contains 40 Scenes.
2. Character `Elizabeth Mercer` appears in 17.
3. Organization `SAD` appears in 11.
4. Review heatmap shows density across Scene columns.
5. User switches to narrative chronology.
6. Flashback Scene positions change accordingly.

Expected result:

Heatmap supports both manuscript sequence and narrative timeline.

---

## 51.11 Export and restore

1. User exports `Bracken Ridge.storyproject`.
2. User clears browser storage or opens another browser.
3. User imports project file.
4. Manuscript, Bible, assets, prompts, planning, Staging sessions, and relationships return.
5. Chutes API key does not appear.

Expected result:

Project is portable while credentials remain device-local.

---

# 52. Open Design Questions

These do not block the product definition but should be resolved during implementation planning.

1. Which rich-text editor framework best matches the requirements?
2. Should project packages use JSON, a small embedded database, or a hybrid format?
3. How should binary assets be compressed inside project exports?
4. Should prompt libraries be global, project-local, or support both?
5. Should Bible templates be global, project-local, or support both?
6. How much automatic Bible occurrence detection should happen during typing versus background indexing?
7. How should ambiguous alias matches be reviewed?
8. What timeline UI best represents flashbacks and non-linear chronology?
9. How much AI request history should be retained by default?
10. Should snapshots be time-based, action-based, or hybrid?
11. How should model pricing metadata be maintained for cost estimates?
12. Should Staging support one model per character in ensemble tests?
13. Should user-created internal links appear visually in manuscript editing while remaining invisible in exports?
14. What should the default project backup cadence warning be?
15. Should PWA installation be part of MVP or a follow-up release?

---

# 53. Product Identity

## Name

**AnansiWriter**

## Short description

A local-first writing and story-management application for novels and series.

## Internal design mantra

**Write the story. Track the world. Follow the threads.**

## Product character

AnansiWriter should feel like a serious writing environment with a deep story database underneath it, not like an AI chatbot with a text editor attached.

The author remains in control.

The system should help preserve continuity, expose structure, centralize references, test character behavior, and make complex multi-book work easier to manage without forcing the author into a rigid methodology.

---

# 54. Summary of Core Requirements

AnansiWriter must ultimately provide:

- Series and Book nesting
- Optional Act hierarchy
- Chapter and Scene structure
- Full rich-text manuscript writing
- Configurable Planning at multiple narrative levels
- A generalized Bible/Codex
- User-defined Bible templates
- Tags, aliases, and keywords
- Relationship links
- Timeline-aware state
- Provenance tracking
- Image and media assets
- Searchable Asset Library
- Review analytics
- Word-count visualization
- Character distribution
- Bible appearance heatmaps
- Manuscript-order and timeline-order analysis
- Chutes AI integration
- Multiple model support
- Configurable Prompt Library
- Prompt General, Instructions, Inputs, and Description
- AI Context Preview
- Context budgeting
- AI request history
- Prompt testing
- Dedicated non-canon Staging workspace
- Character interviews
- Voice tests
- Chemistry tests
- Scene rehearsal
- Branching exploratory sessions
- Explicit promotion of discoveries
- Global search
- Command palette
- Internal links and backlinks
- Autosave
- Recovery snapshots
- Safe deletion
- Portable project export/import
- Schema migration
- Static hosting compatibility
- Local-first privacy
- Offline-capable core
- PWA compatibility
- Keyboard-first writing workflow

---

# 55. Final Architectural Principle

All major AnansiWriter systems should operate on shared project objects rather than maintaining disconnected copies of story information.

Planning, prose, Bible entries, media, relationships, timelines, analytics, and AI context should remain connected through stable internal references.

The goal is not merely to store a manuscript.

The goal is to give the author one coherent place where the story, the world, the plan, the evidence, the experiments, and the finished prose can coexist without turning into a sprawling archive of unrelated documents.
