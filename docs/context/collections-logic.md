============================================================
COLLECTIONS – PRODUCT LOGIC & FUNCTIONAL SPEC
============================================================

This document describes in detail the concept, lifecycle, flow,
roles, permissions, and edge cases of “Collections” in noba*.

It is intended to be used as a reference for product, design,
engineering, and future contributors.

------------------------------------------------------------
1. WHAT IS A COLLECTION
------------------------------------------------------------

A Collection represents the full post-production workflow of a
photoshoot, from the shooting day until final client confirmation.

A Collection:
- Is created by a noba producer
- Has a defined structure of steps (milestones)
- Involves multiple participants (entities + users)
- Evolves through different states over time
- Allows controlled interaction via role-based ownership
- Acts as the single source of truth for the shoot lifecycle

------------------------------------------------------------
2. COLLECTION LIFECYCLE (HIGH LEVEL)
------------------------------------------------------------

1. Creation (Draft)
2. Configuration via Creation Template @creation-template.tsx
3. Publish Collection
4. Execution via View Mode (step-by-step)
5. Completion (after client confirmation)
6. Optional extraordinary reopening (additional photos)

------------------------------------------------------------
3. COLLECTION CREATION FLOW
------------------------------------------------------------

3.1 Entry Point

- User clicks "Create New" in the main navigation
- Selects "Collection"
- A @modal-window.tsx overlay "New Collection" is displayed

3.2 New Collection Modal (Setup Modal)

This modal defines the structure of the collection.

From this modal, the producer configures:
- Collection name
- Client
- Client responsible
- Job reference
- Publishing date & time
- Type of shooting: Digital / Analog HP / Analog HR
- Whether a photographer collaborates with an agency
- Whether the photographer requires retouch / post edition
- Whether the handprint lab is different from the photo_lab

IMPORTANT:
The selections made in this modal determine:
- Which steps appear later
- Which participants are required
- The final structure of the sidebar steps and the respective blocks that appear in the Creation Template

3.3 Draft Creation Confirmation

Once the modal is confirmed:
- The system creates a Draft Collection on the data base
- User is redirected to the Creation Template
- A Toast is displayed:
  “Collection created successfully – <CollectionName> for @<ClientName> has been added to your list as a draft”

------------------------------------------------------------
4. CREATION TEMPLATE (CONFIGURATION MODE)
------------------------------------------------------------

The Creation Template is a multi-step form

Key characteristics:
- Sidebar navigation with steps
- Dynamic steps/blocks based on modal configuration
- Dynamic save (auto-save on every step)
- User can exit and return later
- Draft always reflects the latest saved state

4.1 First Step: Participants (Always Present)

The first step is ALWAYS "Participants".

In this step, the producer:
- Associates entities to the collection
- Invites users from each entity
- Assigns edit permissions per user (collection-level edit rights)

Entities involved may include:
- Client
- Photographer (self-photographer only or self-photographer + agency)
- Photo lab (low-res scanning, and high-res when Analog HR or same lab) — appears only for Analog (HP or HR)
- Handprint lab (high-res) — appears only for Analog HP when "handprint lab differs from photo lab"
- Edition / Retouch studio — appears only if "photographer requires retouch" is marked

Agency Logic:
- If photographer collaborates with an agency:
  - Agency selector appears on photographer participants module
  - Producer can add:
    - Agency team members
    - Independent self-photographers
- If no agency:
  - Only one self-photographer can be selected and will have "edit permissions" mandatory.

Edit Permission:
- A switch per participant defines if they can perform actions
- Edit permission controls who can confirm steps or upload data

------------------------------------------------------------
5. PUBLISH COLLECTION
------------------------------------------------------------

5.1 When Publish Appears

- Publish Collection button appears in the last Creation step
- It remains disabled until all required configuration is complete (all steps completed)
- Appears both:
  - In the last block (Check Finals)
  - In the sidebar -> When the "Check Finals" step is active, the sidebar transforms into two CTA (a squared secondary icon-button to delete + a primary button to publish collection)

5.2 Publish Confirmation Overlay

- Not a modal-window -> we use a <dialog.tsx> but with hiding close button (no X)
- Acts as a confirmation disclaimer
- Shows:
  - Collection summary -> through a <collection-card.tsx> landscape format variant
  - Participants list summuary
- Explains consequences:
  - Draft → Published
  - Participants will be invited

5.3 Effects of Publishing

- Collection status changes from Draft to:
  - Upcoming (default)
  - In Progress (if shooting already started)
- Email invitations are sent to participants
- New users must accept the invite to access noba*
- Collection appears in each participant’s Collections page

------------------------------------------------------------
6. COLLECTION STATES
------------------------------------------------------------

Collection main states:
- Draft
- Upcoming
- In Progress
- Completed
- Canceled

Status derivation: "In Progress" is set when (a) shooting start date has passed, OR (b) the
workflow has progressed (substatus is set or completion_percentage > 0). This ensures that
collections with completed steps never show "Upcoming" even if shooting dates were configured
for the future. Applies to all collection types.

CRITICAL – How "Completed" is reached:
A collection becomes "Completed" ONLY when the Owner of the last step
(Client Confirmation) explicitly confirms by clicking the "Complete collection"
button in the step modal. This applies to ALL collection types regardless of
configuration (Analog/Digital, same/different lab, with/without retouch,
with/without agency). Step completion alone (all step_statuses = "done") does
NOT mark the collection as completed. The deadline passing does NOT mark it
as completed. Only the explicit user action does.

Step-level statuses:
- Locked
- In progress
- Done
- On track / On time / At risk / Delayed (deadline-based)

------------------------------------------------------------
7. COLLECTION VIEW TEMPLATE (VIEW MODE)
------------------------------------------------------------

Once published, collections are accessed via the Collection View Template <collection-template.tsx>

This template includes:
- Navbar <nav-bar.tsx> from custom components
- Collection Heading (collection name + client + photographer + progress + status)
- Vertical div with <collection-stepper.tsx> representing all collection steps
- Each step opens a <modal-window.tsx> overlay with a contextualized summary of the step

------------------------------------------------------------
8. STEP INTERACTION MODEL
------------------------------------------------------------

Each step modal can be in one of three modes:

1. LOCKED / DISABLED
- Step not yet available
- Content partially greyed out with a 40% opacity
- Informational only

2. VIEWER
- User has no edit rights for this step
- Can see curated information
- CANNOT access download links
- CANNOT perform actions

3. OWNER
- User responsible for the step
- Can see everything viewer sees
- PLUS action block:
  - Buttons
  - Inputs
  - Upload fields
  - Confirmations

IMPORTANT RULE:
Only Owners can access download URLs.

------------------------------------------------------------
9. PRODUCER SPECIAL RULE (NOBA* TEAM MEMBERS)
------------------------------------------------------------

The noba Producer (noba* team member) always sees all steps as OWNER and can view all collections.

Edit permission depends on the user's entity-level role (Admin vs Editor):

NOBA Admin:
- Can view and edit ALL collections
- No owner invitation required

NOBA Editor:
- Can view all collections
- Can edit only if the collection owner has invited them as collaborator
  (configured via nobaEditPermissionByUserId / collection_members.can_edit)

Other rules:
- Acts as a fallback to avoid workflow blockage
- This is intentional due to early product adoption

------------------------------------------------------------
9.5 COLLECTION TYPES & STEP DERIVATION (TECHNICAL REFERENCE)
------------------------------------------------------------

This section documents how collection type (Digital / Analog HP / Analog HR)
determines steps, participants, and exceptions. Implementation source:
lib/domain/collections/workflow.ts, view-mode-steps.ts, collection-mappers.ts.

9.5.0 Collection Types Overview

DIGITAL
The photographer shoots with a digital camera. There is no analog development
process: no negatives, no photo lab to develop or scan film. The workflow is
simplified: the photographer makes their selection (typically in low-res),
the client selects, and the photographer converts the selection to high-res
directly. If retouch is needed, the photographer collaborates with the
retouch studio. No photo_lab or handprint_lab is involved.

ANALOG HP (Hand Print)
The photographer shoots on film. A photo lab develops the negatives and
produces low-res scans. The photographer selects from those scans, the client
selects, and the photographer validates the selection. A handprint lab (which
may be the same as the photo lab or a different lab) converts the selection
to high-res. Use "HP" when the handprint lab differs from the photo lab, or
when the high-res output is produced by a specialised handprint lab.

ANALOG HR (High Resolution)
Same as Analog HP in terms of film and low-res workflow, but the photo lab
that did the low-res scanning also performs the high-res conversion. There is
no separate handprint lab. Use "HR" when the same lab handles both scanning
and high-res output.

9.5.1 Configuration Source (DB → Domain)

The New Collection modal selections are persisted in public.collections and
mapped to CollectionConfig as follows:

| DB column (collections)               | Domain (CollectionConfig)     | Collection type |
|-------------------------------------|-------------------------------|------------------|
| low_res_to_high_res_digital = true    | hasLowResLab=true, hasHandprint=false | Digital          |
| low_res_to_high_res_hand_print = true | hasHandprint=true             | Analog           |
| handprint_variant = 'hp'              | handprintVariant="hp"         | Analog HP        |
| handprint_variant = 'hr'              | handprintVariant="hr"         | Analog HR        |
| handprint_different_from_original_lab | handprintIsDifferentLab       | (only when HP)   |
| photographer_request_edition          | hasEditionStudio              | Retouch path     |
| photographer_collaborates_with_agency | hasAgency                     | Agency path      |

Digital: photographer shoots with digital camera; no photo_lab or handprint_lab.
The photographer owns the entire low-res to high-res conversion.

Analog HP: handprint lab can differ from photo_lab (handprintIsDifferentLab).
Analog HR: photo_lab does both low-res scanning and high-res conversion;
handprintIsDifferentLab is always false.

9.5.2 Creation Template Steps by Type

Steps shown in the Creation Template sidebar (computeCreationTemplate):

DIGITAL (hasHandprint = false):
1. Participants
2. Shooting setup
3. Photo selection
4. LR to HR setup (owner: Photographer)
5. Edition config (if hasEditionStudio)
6. Check Finals

ANALOG HP (hasHandprint = true, handprintVariant = "hp"):
1. Participants
2. Shooting setup
3. Drop-off plan
4. Low-res config
5. Photo selection
6. Handprint high-res config (owner: handprint_lab if handprintIsDifferentLab, else photo_lab)
7. Edition config (if hasEditionStudio)
8. Check Finals

ANALOG HR (hasHandprint = true, handprintVariant = "hr"):
- Same steps as Analog HP
- handprintIsDifferentLab is forced to false (photo_lab does both low-res and high-res)
- handprint_lab is never required as participant

9.5.3 View Mode Steps by Type

The View Mode shows 11 canonical steps. Some are inactive (greyed out) per type:

| Step                      | Digital | Analog HP | Analog HR |
|---------------------------|---------|-----------|-----------|
| Shooting                  | active  | active    | active    |
| Negatives drop off        | inactive| active    | active    |
| Low-res scanning          | inactive| active    | active    |
| Photographer selection    | active  | active    | active    |
| Client selection          | active  | active    | active    |
| Photographer review       | inactive| active    | active    |
| Low-res to high-res       | active  | active    | active    |
| Retouch request           | if hasEditionStudio | if hasEditionStudio | if hasEditionStudio |
| Final edits               | if hasEditionStudio | if hasEditionStudio | if hasEditionStudio |
| Photographer last check   | if hasEditionStudio | always active | always active |
| Client confirmation       | active  | active    | active    |

Exceptions:
- Photographer last check: active when hasEditionStudio OR hasHandprint. In Digital
  without retouch it is inactive (photographer validates at LR→HR time).
- Analog HR: LR→HR step title is "Low-res to high-res" (not "Handprint to high-res").
- Analog HP + different lab: LR→HR step shows annotation "by different HP lab".

9.5.4 Required Participants by Type

| Type      | Base participants              | Additional                          |
|-----------|--------------------------------|-------------------------------------|
| Digital   | producer, client, photographer | + agency (if hasAgency)              |
|           |                                | + retouch_studio (if hasEditionStudio) |
| Analog HP | + photo_lab                    | + handprint_lab (if handprintIsDifferentLab) |
| Analog HR | + photo_lab                    | — (photo_lab does low-res and high-res) |

9.5.5 Check Finals Exceptions (Creation Template)

- Digital without edition: only client deadline is required. "Photographer check
  finals" is hidden (redundant — photographer validates at LR→HR time).
- Analog or with edition: both photographer and client deadlines are required.

9.5.6 Substatus & Events

The substatus order is the same for all types:

shooting → negatives_drop_off → low_res_scanning → photographer_selection
→ client_selection → low_res_to_high_res → edition_request → final_edits
→ photographer_last_check → client_confirmation

For Digital, negatives_drop_off and low_res_scanning are inactive; no events
complete them. shooting_ended completes the shooting step; the next active
visible step is photographer_selection, and substatus is synced accordingly.

9.5.7 Code References

- lib/domain/collections/workflow.ts: computeCreationTemplate, getRequiredParticipantRoles, isCreationStepContentComplete
- lib/domain/collections/view-mode-steps.ts: getViewStepDefinitions (inactive, titles, annotations)
- lib/utils/collection-mappers.ts: dbRowToConfig (DB → config mapping)
- lib/services/collections/event-substatus-mapping.ts: event → substatus mapping
- components/custom/new-collection-modal.tsx: Digital / HP / HR selection, handprintIsDifferentLab

------------------------------------------------------------
10. COLLECTION STEPS (DETAILED DESCRIPTIONS)
------------------------------------------------------------

Section 10 describes each step in detail. Which steps apply to each collection
type is defined in §9.5. The "most complete" flow below is Analog (HP or HR);
Digital omits negatives drop-off, low-res scanning, and photographer review
(see §9.5.2, §9.5.3).

10.1 Shooting
Owner:
- Producer

Action:
- Analog: "Have the negatives been collected?" — Confirm pickup (negatives collected for delivery to lab)
- Digital: "Has the shooting been completed?" — Confirm shooting ended (no negatives; photographer has digital files)
- Informational step with location & participants

When producer confirms (Digital): fires shooting_completed_confirmed; photographer receives notification to upload their selection. CTA links to Photographer selection step.

10.2 Negatives Drop-off (Analog only; inactive for Digital)
Owner:
- Photo Lab
- Producer

Action:
- Confirm delivery
- Tracking info
- Possible delay confirmation if confirmation timing exceed deadline

10.3 Low-Res Scanning (Analog only; inactive for Digital)
Owner:
- Photo Lab
- Producer

Action:
- Upload low-res scans (via URL)
- Add notes
- If different high-res by handprint lab:
  - Confirm shipping
  - Add tracking details

Feedback Loop:
- This step might be re-open if Photographer request missing rolls or photos
- Lab can re-upload new URL with updated scans

10.4 Photographer Selection
Owner:
- Photographer
- Producer

Action:
- Analog: Download low-res scans (by accessing the URL provided by Lab). Create selection (out of noba). Upload selection URL.
- Digital: Photographer works from their own digital files (no lab). Create selection (typically in low-res). Upload selection URL.
- Add notes

Feedback Loop:
- This step might be re-open if Client request missing photos
- Photographer uploads revised selection

10.5 Client Selection
Owner:
- Client
- Producer

Action:
- Download photographer selection
- Upload final selection URL
- Add notes

10.6 Photographer Check Client Selection – Analog only (both HP and HR)
Owner:
- Photographer
- Producer

Action:
- Set deadline and time for the photographer to review and validate the client selection.
- The photographer must analyse the client’s final selection and validate or give comments to the lab before the lab converts the selection to high resolution.
- This step appears only when the collection is Hand print; it is placed before “Handprint High-Res” (LR to HR).
- Form in creation: Due date, Time, Owner (Photographer, locked). See Figma 791-60709.

10.7 Low-res to High-Res — Analog (HP or HR)
Owner:
- Handprint Lab (if hand-print lab differs from original lab) — Analog HP only
- Photo Lab (if low-res lab is the same as high-res, or Analog HR)
- Producer

Modal configuration: When "Handprint different from original lab" is OFF, Photo Lab = Handprint Lab.
The Photo Lab is the owner of this step and receives all step-related notifications (e.g. photographer_check_ready_for_hr).
Collections store handprint_lab_id = photo_lab_id in this case so notifications resolve correctly.

Analog HR: photo_lab does both low-res scanning and high-res conversion; handprintIsDifferentLab is always false.

Action:
- Download client selection (after photographer has validated it, in Analog)
- Convert to high-res the selected photos
- Upload high-res URL
- Add notes

10.7b Low-res to High-Res — Digital
Owner:
- Photographer
- Producer

Digital collections: no photo_lab or handprint_lab. The photographer owns the entire conversion.
The photographer converts the client selection to high-res and uploads the URL directly.

Action:
- Convert client selection to high-res
- Upload high-res URL
- Add notes

10.8 Retouch Request
Owner:
- Photographer
- Producer

Action:
- Download high-res selection
- Upload retouch instructions (URL)
- Add notes for edition studio

10.9 Final Edits
Owner:
- Edition / Retouch Studio
- Producer

Action:
- Download:
  - High-res originals
  - Photographer instructions
- Upload final edits URL
- Add notes

Feedback Loop:
- This step might be re-open if Photographer request additional improvements
- Edition / Retouch Studio uploads new URL with improvements

10.10 Photographer Last Check
Owner:
- Photographer
- Producer

This step is active when: hasEditionStudio (photographer checks retouches) OR hasHandprint
(photographer checks high-res before client). Digital without retouch: step is inactive
(photographer validates at LR→HR time; see §9.5.3).

Action:
- Download final edits (or high-res when Analog without retouch)
- Approve finals OR request changes

Feedback Loop:
- Can return to Final Edits step
- Multiple iterations allowed

10.11 Client Confirmation
Owner:
- Client
- Producer
- Any noba user with edit permissions on the collection

Action:
- Download finals
- Confirm project completion by clicking the "Complete collection" button
  (this is the ONLY way to mark the collection as completed)
- Optionally request additional photos

------------------------------------------------------------
11. FEEDBACK LOOPS (ITERATIVE FLOWS)
------------------------------------------------------------

Loops are allowed in three areas:

1. Low-res scanning ↔ Photographer selection
   (missing rolls, incomplete scans)

2. Photographer selection ↔ Client selection
   (missing moments, re-selection)

3. Final edits ↔ Photographer last check
   (retouch adjustments)

Actually, with the new comments logic, we allow loops to happen in almost all steps of the process, but naturally, main loops will be there.

------------------------------------------------------------
12. EXTRAORDINARY CASE: ADDITIONAL PHOTOS
------------------------------------------------------------

After final confirmation, client may request additional photos.

Effect:
- Collection can be re-opened
- Photographer is notified
- New selection is created
- Lab scans again
- Optional edition cycle
- Finals shared again

This is an exceptional scenario and we allow to happen thanks to the new comment-logic.

------------------------------------------------------------
13. NOTIFICATIONS
------------------------------------------------------------

Notifications occur via:
- Email (invites, step ownership)
- In-app (step completion, next owner)

Triggered when:
- Collection is published
- Ownership passes to next step
- Uploads or confirmations occur
- Deadlines are at risk or delayed

------------------------------------------------------------
14. CORE PRINCIPLES
------------------------------------------------------------

- One collection = one source of truth
- Clear ownership per step
- Curated visibility (viewer vs owner)
- Controlled downloads
- Producer safety net
- Iterative, real-world workflows
- Minimal confusion for non-owners

============================================================
END OF DOCUMENT
============================================================
