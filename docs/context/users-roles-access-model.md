NOBA* – USERS, ROLES & ACCESS MODEL
Context Document (Base Truth)

This document defines the user model, roles, permissions, and access rules for the noba* platform.
All future prompts and product logic must rely on the definitions below.

----------------------------------------------------------------
1. USER TYPES IN THE PLATFORM
----------------------------------------------------------------

There are two high-level user groups in noba*:

1. NOBA USERS (Super Admin Entity)
2. ENTITY USERS (All other entities in the ecosystem)

All users in the platform belong to:
- Exactly one Entity
- Exactly one Role within that Entity

----------------------------------------------------------------
2. ENTITY TYPES
----------------------------------------------------------------

Entities represent organizations.

Supported entity types:
- noba* (platform owner / super admin)
- client
- self-photographer (special case, no team)
- agency
- photo lab
- hand print lab
- edition studio

Each entity has:
- Name
- Type
- Additional information (logo, contact email, phone number and notes and
- Location (Street address, ZIP Code, City and Country) - (except client and agency)
- At least 1 admin user
- A Team (except self-photographer)

----------------------------------------------------------------
3. ROLES (APPLY TO ALL ENTITIES)
----------------------------------------------------------------

Each entity supports two selectable roles (Viewer has been removed from selectors):

- Admin
- Editor

Roles are entity-scoped.
A user’s permissions depend on BOTH their role and their entity type.

Note: Viewer is no longer available in role pickers for noba* or entities.
Existing users with Viewer role may still exist in the database for backward compatibility.

There's an exception for the self-photographer, since there's no team, entity information = admin information. No role possibilities. Main user, is user admin and entity at the same time, to registers at once.

----------------------------------------------------------------
4. NOBA ENTITY (SUPER ADMIN)
----------------------------------------------------------------

noba* is a special entity that acts as platform manager.

NOBA USERS – GENERAL RULES
- noba users are the only ones who can access the “Entities” section.
- noba manages the entire system.

NOBA NAVIGATION ACCESS
- Collections
- Entities
- Team

NOBA – ROLE CAPABILITIES

NOBA Admin:
- Full platform access
- Create / edit / delete:
  - Entities
  - Users (any entity)
  - Collections
- Create and manage all collection workflows
- Edit noba company information
- Assign roles and permissions
- Full visibility across all collections
- Collections: can view and edit ALL collections (no owner invitation required)

NOBA Editor:
- Same as Admin EXCEPT:
  - Cannot edit noba company information
  - Cannot change role to noba admins users
- Can create and manage
  - Users
  - Entities
  - Collections (created by themselves)
- Collections: can view all collections; can edit only if the collection owner has invited them as collaborator (configured by owner)

IMPORTANT:
Even noba users only see NOBA USERS inside the “Team” tab.
They do NOT see users from other entities there.

----------------------------------------------------------------
5. ENTITY USERS (NON-NOBA)
----------------------------------------------------------------

Entity users belong to exactly one entity (client, lab, agency, etc.).

ENTITY NAVIGATION ACCESS
- Collections
- Team

They NEVER have access to:
- Entities section

----------------------------------------------------------------
6. TEAM SECTION (CRITICAL RULES)
----------------------------------------------------------------

The Team section always represents:
“Users belonging to MY entity”

Rules:
- A user only sees users from their own entity
- No cross-entity visibility
- Team is NOT a global users list

Examples:
- Zara users only see Zara users
- A lab sees only lab users
- noba sees only noba users

SELF-PHOTOGRAPHER EXCEPTION:
- Self-photographers do NOT have a Team tab
- They have no team
- Navigation:
  - Collections only

----------------------------------------------------------------
7. ENTITY ROLES & PERMISSIONS
----------------------------------------------------------------

Entity Admin:
- Manage entity team:
  - Add users
  - Remove users
  - Change roles
- Edit entity information:
  - Name
  - Logo
  - Contact details (phone number and email address)
  - Location information (except for clients and self-photographers)
- Participate in collections based on permissions
- Take actions inside collections when enabled

Entity Editor:
- Manage team users (add / remove)
- Participate in collections
- Take actions inside collections when enabled
- Cannot edit entity-level information
- Cannot down-grade/modify admin role to admin users

----------------------------------------------------------------
8. COLLECTION ACCESS RULES
----------------------------------------------------------------

Collections are created and configured by noba users (admin and editors)

General rules:
- Users ONLY see collections they are explicitly invited, unless they have admin role (that will allow them to see all team collections)
- Collection visibility is always scoped

Inside a Collection, users may:
- View timeline stages
- Take actions ONLY when:
  - Their role allows it
  - The collection stage requires it 
- Full rules documented in [@collections-logic.md] file

Examples:
- Client Editor:
  - Can approve selections
- Photographer Editor:
  - Can upload LR / HR
- Lab Editor:
  - Can upload files and confirm logistics

----------------------------------------------------------------
9. SUMMARY (MENTAL MODEL)
----------------------------------------------------------------

- noba is a super-admin entity
- Entities are isolated from each other
- Team = entity-scoped users
- Collections = shared collaboration space
- Roles define WHAT users can do
- Collections permission (edit = YES/No), define if user can take actions if stage requires it
- Entity defines WHERE they can do it
- Navigation is role + entity driven

This document is the base reference for:
- Database modeling
- Permission logic
- Navigation rules
- Feature development
