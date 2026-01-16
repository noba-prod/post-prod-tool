# User & Entity Creation Flows

## Purpose

This document defines the conceptual and UX foundations for **User** and **Entity** creation flows in **noba\***.  
It is intended as contextual documentation for implementation and system understanding.

**Collection creation flows are explicitly excluded.**

---

## 1. User

A **User** represents an individual person interacting with the system.

### Attributes

- **First Name** (mandatory)
- **Last Name**
- **Display Name**
  - First Name + Last Name
- **Email** (mandatory)
- **Phone Number** (mandatory)
- **Entity** (mandatory) -> since the flow of user creation always start from the entity detail, the Entity field is always selected and disabled. But it has to be shown to highlight and re-enphasize the entity connected.
- **Role** (mandatory):
  - Admin
  - Editor
  - Viewer

### Creation Pattern

- Users are always created through the `modal-window.tsx` component.
- As defined in `components/custom`, the modal includes:
  - Header with `titles.tsx` and close button (X)
  - Form body using `layout.tsx` (from `components/custom`)
  - Bottom action bar using `action-bar.tsx`
    - Primary action to register members in the entity

---

## 2. Entity Types

Entities represent organizations or individual actors in the ecosystem.

### Supported Entity Types

- Client
- Agency
- Photo Lab
- Edition Studio
- Hand Print Lab
- Self-Photographer

---

## 3. Self-Photographer

A **Self-Photographer** represents a single individual who does not belong to a team or organization.

### Creation Flow

- Triggered via **Create Self-Photographer**
- Uses the same `modal-window.tsx` pattern as User creation
- No team management or multi-user logic

### Form Behavior

#### Disabled (fixed values)

- **Entity Type**: Self-Photographer
- **Role**: Admin

#### Editable Fields

- First Name
- Last Name
- Email
- Phone Number
- Notes

### Side Effects

Creating a Self-Photographer implicitly creates:
- The **Entity** (Self-Photographer)
- The associated **Admin User**

---

## 4. Standard Entity Creation

Applies to:
- Client
- Agency
- Photo Lab
- Edition Studio
- Hand Print Lab

Uses a **Creation Page Template (Type 2)** with **two steps**.

---

### 4.1 Step 1 – Basic Information

The **Basic Information** step is composed of up to three blocks.

#### A. Entity Details (mandatory)

- **Entity Type**
  - Changing the type can affect required fields
- **Entity Name**

#### B. Location (mandatory only for specific entities)

**Required for:**
- Agency
- Photo Lab
- Edition Studio
- Hand Print Lab

**Not required for:**
- Client

**Fields:**
- Street Address
- ZIP Code
- City (combo box, auto-fillable)
- Country (combo box, auto-fillable)

#### C. Additional Information (optional, always shown)

- Email
- Phone Number
- Profile Picture upload
- Notes

**Notes:**
- Mandatory blocks appear first
- Optional information is visually separated using a **separator component**

---

### 4.2 Step 2 – Team Members

- Clicking **Next** after Basic Information automatically opens the **New Admin User** modal
- The **Entity is not created** until an Admin User is successfully created

#### Once the Admin User is created

- The Entity is persisted in the database
- The Admin User appears in the **Team Members** table
- The UI navigates to the **Team Members** step
- An informative toast is shown: "[EntityType] has been created![@EntityName] has been added to your list"

#### Team Members Step Includes

- Title and description
- **Filter Bar** component (Team Members / Participants) with CTA: **New Member**
- **Team Members table** (design-system component)