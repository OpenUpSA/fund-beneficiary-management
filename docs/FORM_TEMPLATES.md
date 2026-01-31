# Form Templates Documentation

This document provides a comprehensive guide to the form template system used in the Fund Beneficiary Management application.

## Table of Contents

1. [Overview](#overview)
2. [Form Structure](#form-structure)
3. [Field Types](#field-types)
4. [Layouts](#layouts)
5. [Configuration Options](#configuration-options)
6. [Conditional Logic](#conditional-logic)
7. [Data Prefilling](#data-prefilling)
8. [Access Control](#access-control)
9. [File Locations](#file-locations)
10. [Examples](#examples)

---

## Overview

Form templates are JSON files that define the structure, fields, and behavior of forms. They are rendered dynamically by React components and support features like conditional visibility, dynamic options, data prefilling, and access control.

### Existing Form Templates

| Template | File | Purpose |
|----------|------|---------|
| DFT Application | `dft-application.json` | Development Fund Training application |
| DFT Report | `dft-report.json` | Development Fund Training report |
| Field Visit Report | `field-visit-report.json` | Site visit documentation |
| Grant Funding Application | `grant-funding-application.json` | Grant application form |
| Narrative Report | `narrative-report.json` | Periodic narrative reporting |

---

## Form Structure

### Top-Level Structure

```json
{
  "title": "Form Title",
  "sections": [...]
}
```

### Section Structure

```json
{
  "title": "Section Title",
  "description": "Optional section description",
  "notice": "Important notice displayed at top of section",
  "editable_by": ["admin", "programme_officer"],
  "fields": [...]
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `title` | string | Yes | Section heading |
| `description` | string | No | Explanatory text below title |
| `notice` | string | No | Highlighted notice box |
| `editable_by` | string[] | No | Roles that can edit (empty = locked) |
| `fields` | Field[] | Yes | Array of field definitions |

---

## Field Types

### Basic Field Structure

```json
{
  "name": "field_name",
  "type": "text",
  "label": "Field Label",
  "required": true,
  "placeholder": "Enter value...",
  "description": "Helper text below label"
}
```

### Available Field Types

| Type | Component | Description | Used In |
|------|-----------|-------------|---------|
| `text` | `TextField` | Single-line text input | All templates |
| `textarea` | `TextareaField` | Multi-line text input | All templates |
| `number` | `DefaultField` | Numeric input with min/max | narrative-report, dft-report |
| `email` | `DefaultField` | Email input with validation | grant-funding-application |
| `date` | `DateField` | Date picker | All templates |
| `currency` | `CurrencyField` | Currency input (ZAR) | grant-funding-application, narrative-report |
| `select` | `SelectField` | Single-select dropdown | dft-application, grant-funding-application |
| `multiselect` | `MultiSelect` | Multi-select with tags | All templates |
| `radio` | `RadioField` | Radio button group | narrative-report, field-visit-report |
| `toggle` | `ToggleField` | Boolean switch | dft-report |
| `group` | `GroupField` | Container for subfields | grant-funding-application, dft-report |
| `fileUpload` | `FileUpload` | File/image uploader | dft-application, dft-report, field-visit-report |
| `repeatable` | `RepeatableLayout` | Dynamic list of field groups | narrative-report |
| `data-table` | `DataTableLayout` | Read-only data table | grant-funding-application |

---

### Field Type Details

#### text
Simple single-line text input.

```json
{
  "name": "activity_name",
  "type": "text",
  "label": "Name of activity",
  "required": true,
  "placeholder": "Enter the name of the activity"
}
```

#### textarea
Multi-line text input for longer content.

```json
{
  "name": "description",
  "type": "textarea",
  "label": "Description",
  "description": "Provide a detailed description",
  "required": true,
  "placeholder": "Enter details here"
}
```

#### number
Numeric input with optional min/max constraints.

```json
{
  "name": "attendee_count",
  "type": "number",
  "label": "Number of attendees",
  "required": true,
  "min": 0,
  "max": 1000
}
```

#### date
Date picker component.

```json
{
  "name": "activity_date",
  "type": "date",
  "label": "Date of activity",
  "required": true
}
```

#### currency
Currency input formatted for ZAR.

```json
{
  "name": "amount_raised",
  "type": "currency",
  "label": "Amount raised",
  "currency": "ZAR",
  "required": true
}
```

#### select
Single-select dropdown with static options.

```json
{
  "name": "activity_type",
  "type": "select",
  "label": "Type of activity",
  "required": true,
  "options": [
    { "label": "Training", "value": "training" },
    { "label": "Workshop", "value": "workshop" },
    { "label": "Other", "value": "other" }
  ]
}
```

#### multiselect
Multi-select with static or dynamic options.

```json
{
  "name": "focus_areas",
  "type": "multiselect",
  "label": "Focus areas",
  "required": true,
  "options": [
    { "label": "Youth", "value": "youth" },
    { "label": "Justice", "value": "justice" },
    { "label": "Gender", "value": "gender" }
  ]
}
```

**With dynamic options:**

```json
{
  "name": "staff_representatives_met",
  "type": "multiselect",
  "label": "Staff representatives met",
  "config": {
    "dynamicOptionTable": "staff_members"
  },
  "required": true
}
```

Available `dynamicOptionTable` values:
- `funders` - Fetches from `/api/funder-list`
- `staff_members` - Fetches from `/api/lda/{id}/staff?is_committee=false`
- `committee_members` - Fetches from `/api/lda/{id}/staff?is_committee=true`

#### radio
Radio button group for single selection.

```json
{
  "name": "org_profile_changed",
  "type": "radio",
  "label": "Has the organisational profile changed?",
  "required": true,
  "options": [
    { "label": "No", "value": "no" },
    { "label": "Yes", "value": "yes" }
  ]
}
```

#### toggle
Boolean switch (true/false).

```json
{
  "name": "did_not_take_attendance",
  "type": "toggle",
  "label": "We did not take attendance for this activity",
  "required": false
}
```

**Note:** Toggle values are stored as strings `"true"` or `"false"`.

#### group
Container for grouping related subfields.

```json
{
  "name": "contact_details",
  "type": "group",
  "label": "Contact Details",
  "required": true,
  "fields": [
    {
      "name": "phone",
      "type": "text",
      "label": "Phone Number",
      "required": true
    },
    {
      "name": "email",
      "type": "email",
      "label": "Email",
      "required": true
    }
  ]
}
```

**Note:** Subfield names are stored as `{group_name}_{subfield_name}` (e.g., `contact_details_phone`).

#### fileUpload
File upload with drag-and-drop support.

```json
{
  "name": "budget_upload",
  "type": "fileUpload",
  "label": "Upload a copy of your budget",
  "multiple": false,
  "required": true,
  "config": {
    "destination": "document",
    "accepted_file_types": [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/png",
      "image/jpeg"
    ]
  }
}
```

| Config Property | Type | Description |
|-----------------|------|-------------|
| `destination` | `"media"` \| `"document"` | Upload API endpoint |
| `accepted_file_types` | string[] | MIME types allowed |

**Default accepted types:**
- `media`: PNG, JPEG, JPG, WEBP, GIF
- `document`: PDF, DOC, DOCX, XLS, XLSX

---

## Layouts

Layouts control how fields are rendered. Set via the `layout` property.

### Default Layout
Standard vertical field rendering with label, description, and input.

### data-table
Read-only table display for prefilled data.

```json
{
  "name": "organisation_staff_members",
  "type": "data-table",
  "label": "Staff Members",
  "layout": "data-table",
  "config": {
    "columns": [
      { "label": "Name", "value": "name" },
      { "label": "Gender", "value": "gender" },
      { "label": "Position(s)", "value": "position" }
    ]
  },
  "prefill": {
    "path": "organisation_staff_members",
    "source": "organisation_staff"
  }
}
```

### label-value-list
Horizontal label-input layout with optional computed total.

```json
{
  "name": "overall_attendance",
  "type": "group",
  "layout": "label-value-list",
  "label": "Overall attendance for this activity",
  "required": false,
  "fields": [
    { "name": "non_lda_attendees", "type": "number", "label": "Non-LDA attendees", "placeholder": "Value" },
    { "name": "lda_staff_attendees", "type": "number", "label": "LDA staff attendees", "placeholder": "Value" },
    { "name": "lda_board_attendees", "type": "number", "label": "LDA board member attendees", "placeholder": "Value" }
  ],
  "config": {
    "showTotal": true,
    "totalLabel": "Total attendees"
  }
}
```

| Config Property | Type | Description |
|-----------------|------|-------------|
| `showTotal` | boolean | Show computed total row |
| `totalLabel` | string | Label for total row (default: "Total") |

### repeatable
Dynamic list allowing users to add/remove field groups.

```json
{
  "name": "challenge",
  "type": "repeatable",
  "layout": "repeatable",
  "label": "List of challenges",
  "notice": "Use the list below to add details.",
  "default": 0,
  "item_label": "Challenge",
  "config": {
    "add_button_label": "Add a challenge",
    "cardLabel": "Challenge",
    "removeLable": "Remove challenge"
  },
  "template": [
    {
      "name": "description",
      "type": "textarea",
      "label": "Briefly describe the challenge",
      "required": true
    },
    {
      "name": "resolved",
      "type": "radio",
      "label": "Were you able to overcome this challenge?",
      "required": true,
      "options": [
        { "label": "No", "value": "no" },
        { "label": "Yes", "value": "yes" }
      ]
    }
  ]
}
```

| Property | Type | Description |
|----------|------|-------------|
| `template` | Field[] | Fields repeated for each item |
| `default` | number | Initial number of items (0 = none) |
| `item_label` | string | Label for each item |
| `config.add_button_label` | string | Add button text |
| `config.cardLabel` | string | Card header prefix |
| `config.removeLable` | string | Remove button text |

---

## Configuration Options

### Field-Level Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Unique field identifier |
| `type` | FieldType | Field type (see above) |
| `label` | string | Display label |
| `required` | boolean | Whether field is required |
| `description` | string | Helper text below label |
| `placeholder` | string | Input placeholder text |
| `disabled` | boolean | Prevents editing |
| `width` | `"half"` \| `"full"` | Column width (default: full) |
| `min` | number | Minimum value (number fields) |
| `max` | number | Maximum value (number fields) |
| `options` | Option[] | Static options for select/multiselect/radio |
| `multiple` | boolean | Allow multiple files (fileUpload) |
| `notice` | string | Notice text for repeatable fields |

### The `config` Object

The `config` property holds component-specific configuration:

```json
{
  "config": {
    "destination": "media",
    "accepted_file_types": ["image/png"],
    "dynamicOptionTable": "staff_members",
    "columns": [...],
    "add_button_label": "Add item",
    "cardLabel": "Item",
    "removeLable": "Remove item"
  }
}
```

---

## Conditional Logic

### show_if
Show a field only when another field has a specific value.

```json
{
  "name": "updated_org_profile",
  "type": "textarea",
  "label": "Updated organisational profile",
  "required": true,
  "show_if": {
    "field": "org_profile_changed",
    "value": "yes"
  }
}
```

**For toggle fields**, use string values:

```json
{
  "show_if": {
    "field": "did_not_take_attendance",
    "value": "true"
  }
}
```

### depends_on
Dynamically change field options/label based on another field's value.

```json
{
  "name": "training_type",
  "type": "multiselect",
  "label": "Type of training",
  "options": [],
  "required": true,
  "depends_on": {
    "field": "activity_type",
    "rules": [
      {
        "when": "training",
        "label": "Type of training to be given",
        "options": [
          { "label": "Digital skills", "value": "digital_skills" },
          { "label": "Leadership", "value": "leadership" }
        ]
      },
      {
        "when": "workshop",
        "label": "Type of workshop",
        "options": [
          { "label": "Team Building", "value": "team_building" },
          { "label": "Strategy Planning", "value": "strategy" }
        ]
      }
    ],
    "enabled_when": ["training", "workshop"],
    "default_disabled": true,
    "default_options": []
  }
}
```

| Property | Type | Description |
|----------|------|-------------|
| `field` | string | Field to watch |
| `rules` | DependsOnRule[] | Conditional rules |
| `rules[].when` | string | Value that triggers this rule |
| `rules[].label` | string | New label when rule matches |
| `rules[].options` | Option[] | New options when rule matches |
| `enabled_when` | string[] | Values that enable the field |
| `disabled_when` | string[] | Values that disable the field |
| `default_disabled` | boolean | Start disabled |
| `default_options` | Option[] | Fallback options |

---

## Data Prefilling

Prefill fields with data from the organisation or linked forms.

```json
{
  "name": "organisation_name",
  "type": "text",
  "label": "Organisation Name",
  "prefill": {
    "source": "organisation",
    "path": "name"
  }
}
```

### Prefill Sources

| Source | Description | Example Path |
|--------|-------------|--------------|
| `organisation` | Direct LDA properties | `name`, `registrationCode`, `about` |
| `organisation_detail` | OrganisationDetail relation | `contactNumber`, `email`, `physicalStreet` |
| `organisation_operations` | Operations relation | `vision`, `mission`, `objectives` |
| `organisation_staff` | Staff members | `organisation_staff_members`, `organisation_board_members` |
| `linkedForm` | Linked form's formData | Any field name from linked form |

### Prefill Processing

Prefilling happens in the API route (`/api/lda-form/[lda_form_id]/route.ts`):

1. Form is fetched with related data
2. Each field with `prefill` is checked
3. If field has no existing value, prefill value is applied
4. Prefilled data is returned with the form

---

## Access Control

### Section-Level: editable_by

Control which user roles can edit a section.

```json
{
  "title": "Activity information",
  "editable_by": [],
  "fields": [...]
}
```

| Value | Behavior |
|-------|----------|
| Not set | Anyone can edit |
| `[]` (empty array) | No one can edit (locked) |
| `["admin", "programme_officer"]` | Only listed roles can edit |

### Field-Level: disabled

Prevent editing of individual fields.

```json
{
  "name": "activity_name",
  "type": "text",
  "label": "Name of activity",
  "disabled": true
}
```

---

## File Locations

### Form Templates
```
/form-templates/
├── dft-application.json
├── dft-report.json
├── field-visit-report.json
├── grant-funding-application.json
└── narrative-report.json
```

### Components
```
/components/form-templates/
├── form-field.tsx              # Main field renderer
├── form-accordion-item.tsx     # Section accordion with state management
├── form.tsx                    # Full form component
├── dynamicForm.tsx             # Dynamic form loader
├── editor.tsx                  # Form editor
├── custom-components/
│   ├── CurrencyField.tsx
│   ├── DateField.tsx
│   ├── DefaultField.tsx
│   ├── FileUpload.tsx
│   ├── GroupField.tsx
│   ├── MultiSelect.tsx
│   ├── RadioField.tsx
│   ├── SelectField.tsx
│   ├── TextField.tsx
│   ├── TextareaField.tsx
│   ├── ToggleField.tsx
│   └── index.ts
└── custom-layouts/
    ├── data-table.tsx
    └── repeatable.tsx
```

### Types
```
/types/forms.ts
```

### API Routes
```
/app/api/lda-form/[lda_form_id]/
├── route.ts          # GET, PUT, DELETE, PATCH
└── field/route.ts    # Field-level updates
```

---

## Examples

### Simple Text Field
```json
{
  "name": "venue",
  "type": "text",
  "label": "Venue",
  "required": true,
  "placeholder": "Enter venue name"
}
```

### Conditional Textarea
```json
{
  "name": "org_profile_changed",
  "type": "radio",
  "label": "Has the profile changed?",
  "required": true,
  "options": [
    { "label": "No", "value": "no" },
    { "label": "Yes", "value": "yes" }
  ]
},
{
  "name": "updated_profile",
  "type": "textarea",
  "label": "Updated profile",
  "required": true,
  "show_if": {
    "field": "org_profile_changed",
    "value": "yes"
  }
}
```

### Prefilled Group with Half-Width Fields
```json
{
  "name": "address",
  "type": "group",
  "label": "Address",
  "required": true,
  "fields": [
    {
      "name": "street",
      "type": "text",
      "label": "Street",
      "prefill": { "source": "organisation_detail", "path": "physicalStreet" },
      "required": true
    },
    {
      "name": "city",
      "type": "text",
      "label": "City",
      "width": "half",
      "prefill": { "source": "organisation_detail", "path": "physicalCity" },
      "required": true
    },
    {
      "name": "province",
      "type": "text",
      "label": "Province",
      "width": "half",
      "prefill": { "source": "organisation_detail", "path": "physicalProvince" },
      "required": true
    }
  ]
}
```

### File Upload with Custom Types
```json
{
  "name": "attendance_register",
  "type": "fileUpload",
  "label": "Upload attendance register",
  "multiple": true,
  "required": true,
  "config": {
    "destination": "media",
    "accepted_file_types": ["image/png", "image/jpeg", "image/jpg"]
  }
}
```

### Repeatable with Nested Conditional
```json
{
  "name": "challenges",
  "type": "repeatable",
  "layout": "repeatable",
  "label": "Challenges",
  "show_if": { "field": "faced_challenges", "value": "yes" },
  "default": 0,
  "config": {
    "add_button_label": "Add challenge",
    "cardLabel": "Challenge",
    "removeLable": "Remove"
  },
  "template": [
    {
      "name": "description",
      "type": "textarea",
      "label": "Describe the challenge",
      "required": true
    },
    {
      "name": "resolved",
      "type": "radio",
      "label": "Was it resolved?",
      "required": true,
      "options": [
        { "label": "No", "value": "no" },
        { "label": "Yes", "value": "yes" }
      ]
    },
    {
      "name": "resolution",
      "type": "textarea",
      "label": "How was it resolved?",
      "required": true,
      "show_if": { "field": "resolved", "value": "yes" }
    }
  ]
}
```

### Locked Section with Prefilled Data
```json
{
  "title": "Activity Information",
  "editable_by": [],
  "fields": [
    {
      "name": "activity_name",
      "type": "text",
      "label": "Activity Name",
      "required": true,
      "disabled": true,
      "prefill": { "source": "linkedForm", "path": "activity_name" }
    }
  ]
}
```

---

## TypeScript Types Reference

```typescript
type FieldType = 
  | "string" | "number" | "textarea" | "email" | "text" 
  | "radio" | "group" | "select" | "date" | "currency" 
  | "repeatable" | "multiselect" | "fileUpload" | "toggle";

interface Field {
  name: string;
  type: FieldType;
  label: string;
  required?: boolean;
  description?: string;
  placeholder?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  width?: "half" | "full";
  options?: { value: string; label: string }[];
  fields?: Field[];
  template?: Field[];
  layout?: string;
  show_if?: { field: string; value: string };
  depends_on?: DependsOn;
  prefill?: { source: string; path: string };
  config?: Record<string, unknown>;
  notice?: string;
}

interface Section {
  title: string;
  description?: string;
  notice?: string;
  fields: Field[];
  editable_by?: string[];
}

interface Form {
  title: string;
  sections: Section[];
}
```

---

## Config Consolidation Plan

This section outlines a migration plan to consolidate scattered configuration properties into a unified `config` object for cleaner, more maintainable form templates.

### Current State Analysis

Configuration properties are currently scattered at the field level:

```json
{
  "name": "field_name",
  "type": "text",
  "label": "Label",
  "prefill": { "source": "...", "path": "..." },
  "show_if": { "field": "...", "value": "..." },
  "depends_on": { "field": "...", "rules": [...] },
  "config": { "destination": "media" }
}
```

### Proposed Structure

Move behavioral/conditional properties into the `config` object:

```json
{
  "name": "field_name",
  "type": "text",
  "label": "Label",
  "config": {
    "prefill": { "source": "...", "path": "..." },
    "show_if": { "field": "...", "value": "..." },
    "depends_on": { "field": "...", "rules": [...] },
    "destination": "media"
  }
}
```

### Overlaps Between show_if and depends_on

| Feature | `show_if` | `depends_on` | Overlap? |
|---------|-----------|--------------|----------|
| Hide/show field | ✅ | ❌ | No |
| Change options | ❌ | ✅ | No |
| Change label | ❌ | ✅ | No |
| Enable/disable field | ❌ | ✅ (`enabled_when`, `disabled_when`) | **Potential** |
| React to field value | ✅ | ✅ | **Yes** |

#### Overlapping Properties in `depends_on` to Consider Removing

1. **`enabled_when` / `disabled_when`** - Could be handled by `show_if` for visibility, or a new `disabled_if` for disabling without hiding.

2. **`default_disabled`** - Could be replaced with field-level `disabled: true` combined with `depends_on` for enabling.

#### Recommendation

- **Keep `show_if`** for: Visibility control (show/hide)
- **Keep `depends_on`** for: Dynamic options, dynamic labels
- **Consider removing from `depends_on`**: `enabled_when`, `disabled_when`, `default_disabled`
- **Consider adding**: `disabled_if` as a new property similar to `show_if` for disabling fields conditionally

### Migration Steps

#### Step 1: Audit Current Usage
- [ ] List all fields using `prefill` across templates
- [ ] List all fields using `show_if` across templates
- [ ] List all fields using `depends_on` across templates
- [ ] Identify which `depends_on` properties are actually used

#### Step 2: Clean Up depends_on Overlaps
- [ ] Review `enabled_when` / `disabled_when` usage
- [ ] Decide: Remove or convert to `disabled_if`
- [ ] Update `DependsOn` TypeScript interface
- [ ] Update `form-accordion-item.tsx` logic

#### Step 3: Consolidate into config Object
- [ ] Update TypeScript `Field` interface to nest properties under `config`
- [ ] Update `form-accordion-item.tsx` to read from `config.*`
- [ ] Update `form-field.tsx` to read from `config.*`
- [ ] Update API route prefill logic to read from `config.prefill`

#### Step 4: Migrate Form Templates
- [ ] `dft-application.json`
- [ ] `dft-report.json`
- [ ] `field-visit-report.json`
- [ ] `grant-funding-application.json`
- [ ] `narrative-report.json`

#### Step 5: Testing
- [ ] Test conditional visibility (`show_if`)
- [ ] Test dynamic options (`depends_on`)
- [ ] Test prefilling from all sources
- [ ] Test file uploads
- [ ] Test repeatable fields

### Current depends_on Usage Analysis

From the existing templates:

| Template | Field | depends_on Properties Used |
|----------|-------|---------------------------|
| `dft-application.json` | `training_type` | `field`, `rules` (with `when`, `options`, `label`), `enabled_when`, `default_disabled`, `default_options` |

**Properties actively used:**
- `field` ✅
- `rules` ✅
- `rules[].when` ✅
- `rules[].options` ✅
- `rules[].label` ✅
- `enabled_when` ⚠️ (overlap with show_if)
- `default_disabled` ⚠️ (overlap with disabled)
- `default_options` ✅

**Properties defined but potentially unused:**
- `disabled_when` - Check if used anywhere
- `rules[].enabled` - Check if used anywhere

### Proposed Final Field Interface

```typescript
interface Field {
  // Core properties (keep at top level)
  name: string;
  type: FieldType;
  label: string;
  required?: boolean;
  description?: string;
  placeholder?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  width?: "half" | "full";
  options?: Option[];
  fields?: Field[];
  template?: Field[];
  layout?: string;
  notice?: string;
  
  // Behavioral config (consolidate here)
  config?: {
    // Conditional logic
    show_if?: { field: string; value: string };
    disabled_if?: { field: string; value: string };  // NEW
    depends_on?: {
      field: string;
      rules?: { when: string; options?: Option[]; label?: string }[];
      default_options?: Option[];
    };
    
    // Data prefilling
    prefill?: { source: string; path: string };
    
    // Component-specific
    destination?: "media" | "document";
    accepted_file_types?: string[];
    dynamicOptionTable?: string;
    columns?: { label: string; value: string }[];
    
    // Repeatable-specific
    add_button_label?: string;
    cardLabel?: string;
    removeLable?: string;
  };
}
```

### Notes

- Migration should be done incrementally, one template at a time
- Keep backward compatibility during migration (support both old and new structure)
- Add deprecation warnings in code for old property locations
- Update this documentation after each step is completed
