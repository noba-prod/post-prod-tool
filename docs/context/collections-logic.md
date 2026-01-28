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
- Manager (admin)
- Starting date / deadlines
- Whether a photographer collaborates with an agency
- Whether labs, handprint labs, or edition studios are involved

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
- Lab (low-res) -> appears only if handprint marked on the modal configuration
- Handprint lab (high-res) -> appears only if marked on the modal configuration <handprint lab differ from low-res lab>
- Edition / Retouch studio -> only appears if marked on modal configuration

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
9. PRODUCER SPECIAL RULE
------------------------------------------------------------

The noba Producer:
- Always sees all steps as OWNER
- Can perform actions on any step
- Acts as a fallback to avoid workflow blockage
- This is intentional due to early product adoption

------------------------------------------------------------
10. COLLECTION STEPS (MOST COMPLETE FLOW)
------------------------------------------------------------

10.1 Shooting
Owner:
- Producer

Action:
- Confirm shooting has happened and negatives have been collected by shipping provider
- Informational step with location & participants

10.2 Negatives Drop-off
Owner:
- Photo Lab
- Producer 

Action:
- Confirm delivery
- Tracking info
- Possible delay confirmation if confirmation timing exceed deadline

10.3 Low-Res Scanning
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
- Download low-res scans (by accessing to the URL provided by Lab)
- Create selection (out of noba)
- Upload selection URL
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

10.6 Handprint High-Res
Owner:
- Handprint Lab (if hand-print lab differs from original lab)
- Photo Lab (if low-res lab is the same as high-res)

Action:
- Download client selection
- Convert to high-res the selected photos
- Upload high-res URL
- Add notes

10.7 Edition Request
Owner:
- Photographer
- Producer

Action:
- Download high-res selection
- Upload retouch instructions (URL)
- Add notes for edition studio

10.8 Final Edits
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

10.9 Photographer Last Check
Owner:
- Photographer
- Producer

Action:
- Download final edits
- Approve finals OR request changes

Feedback Loop:
- Can return to Final Edits step
- Multiple iterations allowed

10.10 Client Confirmation
Owner:
- Client
- Producer

Action:
- Download finals
- Confirm project completion
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

This is an exceptional scenario and will be handled later.

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
