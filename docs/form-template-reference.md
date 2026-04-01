# Form Template JSON Reference

This document describes all available field types, layouts, modifiers, and section properties used to create form template JSON files (stored in `/form-templates/`).

---

## Form Structure

```json
{
  "title": "Form Title",
  "sections": [
    {
      "title": "Section Title",
      "tag": "Optional Category",
      "description": "Optional description text",
      "notice": "Optional highlighted notice (supports HTML)",
      "editable_by": ["SUPER_USER", "FUNDER"],
      "visible_to": ["SUPER_USER"],
      "admin_feedback": true,
      "fields": []
    }
  ]
}
```

### Section Properties

| Property | Type | Description |
|---|---|---|
| `title` | `string` | Section heading (required) |
| `tag` | `string` | Category badge displayed next to the title (e.g., `"Casework"`, `"Food gardening"`) |
| `description` | `string` | Subtitle text shown below the heading |
| `notice` | `string` | Highlighted notice block shown inside the section |
| `editable_by` | `string[]` | Restrict editing to specific roles. If omitted, editable by anyone |
| `visible_to` | `string[]` | Restrict visibility to specific roles. If omitted, visible to everyone |
| `admin_feedback` | `boolean` | Enables admin feedback UI on this section |

---

## Basic Field Types

Every field requires at minimum: `name`, `type`, and `label`.

```json
{
  "name": "unique_field_name",
  "type": "text",
  "label": "Field Label",
  "required": true
}
```

### Available Types

| Type | Description | Key Properties |
|---|---|---|
| `text` | Single-line text input | `placeholder`, `maxLength` |
| `textarea` | Multi-line text input | `placeholder`, `maxLength` |
| `number` | Numeric input | `min`, `max`, `placeholder` |
| `currency` | Currency input | `min`, `max` |
| `email` | Email input | `placeholder` |
| `date` | Date picker | — |
| `select` | Single-choice dropdown | `options` |
| `multiselect` | Multi-choice selector | `options` or `config.dynamicOptionTable` |
| `radio` | Radio button group | `options` |
| `toggle` | Boolean toggle switch | Use with `layout: "toggle"` |
| `fileUpload` | File upload | `config.destination`, `config.accepted_file_types`, `multiple` |
| `repeatable` | Repeatable group of fields | `template[]`, `layout`, `config`, `value: "[]"` |
| `group` | Container for sub-fields | `fields[]`, can have custom `layout` |
| `info` | Read-only info/guidance block | `notice` (supports HTML) |

---

## Field Properties

### Common Properties

| Property | Type | Description |
|---|---|---|
| `name` | `string` | Unique field identifier (required) |
| `type` | `string` | Field type from the list above (required) |
| `label` | `string` | Display label (required) |
| `required` | `boolean` | Whether the field must have a value |
| `description` | `string` | Help text shown below the label |
| `notice` | `string` | Highlighted notice (supports HTML) |
| `subtitle` | `string` | Secondary text next to the label |
| `placeholder` | `string` | Placeholder text for inputs |
| `width` | `"half" \| "full"` | Column width. `"half"` = side-by-side, `"full"` = default |
| `show` | `boolean` | Set `false` to hide field (used for status tracking) |
| `icon` | `string` | Lucide icon name to display |
| `value` | `string` | Default value |
| `options` | `array` | Array of `{ value, label }` for select/radio/multiselect |

### Options Format

```json
"options": [
  { "value": "option_1", "label": "Option One" },
  { "value": "option_2", "label": "Option Two" }
]
```

### Dynamic Options from Database

Instead of hardcoded options, load from a database table:

```json
{
  "type": "multiselect",
  "config": {
    "dynamicOptionTable": "focus_areas"
  }
}
```

---

## Conditional Logic

### `show_if` — Conditional Visibility

Show a field only when another field has a specific value:

```json
{
  "name": "details_field",
  "type": "textarea",
  "label": "Please provide details",
  "required": true,
  "show_if": {
    "field": "parent_field_name",
    "value": "yes",
    "show_by_default": false
  }
}
```

- `field` — Name of the field to watch
- `value` — Value that triggers visibility
- `show_by_default` — Whether to show before the watched field has a value (default: `false`)

> **Note:** Inside repeatable templates, `show_if.field` references are automatically prefixed with the parent field name and index at runtime.

### `depends_on` — Dynamic Options Based on Another Field

```json
{
  "name": "sub_category",
  "type": "select",
  "label": "Sub-category",
  "depends_on": {
    "field": "main_category",
    "default_options": [{ "value": "none", "label": "Select a category first" }],
    "rules": [
      {
        "when": "category_a",
        "options": [
          { "value": "a1", "label": "Sub A1" },
          { "value": "a2", "label": "Sub A2" }
        ],
        "label": "Optional override label"
      }
    ]
  }
}
```

---

## Prefill

Fields can be automatically populated with data from various sources when the form is loaded. The backend resolves prefill values on the GET request for the form.

```json
{
  "prefill": {
    "source": "source_name",
    "path": "property_or_value"
  }
}
```

### Available Prefill Sources

| Source | Description | `path` usage |
|---|---|---|
| `organisation` | Direct properties of the LDA organisation | Property name (e.g., `"name"`) |
| `organisation_detail` | Properties from the organisation's detail record | Property name (e.g., `"registration_number"`) |
| `organisation_operations` | Properties from the organisation's operations record | Property name |
| `organisation_staff` | Staff member lists | `"organisation_staff_members"` or `"organisation_board_members"` |
| `linkedForm` | Properties from the linked form's `formData` | Field name key in linked form's data |
| `defaultValue` | Static default value | The literal value to set (e.g., `"new"`, `"false"`) |
| `core_grant_funding` | Approved grant funding amount ÷ 4 (quarterly). Finds the approved `grant_funding` form where the current form's `fundingStart` falls within the grant's date range. | `"quarterly_amount"` |
| `fris_funding` | Sum of approved FRIS claim amounts. Finds all approved `fris_claim` forms where the current form's `fundingStart` falls within the claim period. | `"period_amount"` |
| `dft_funding` | Sum of approved DFT application amounts. Finds all approved `dft_application` forms where the current form's `fundingStart` falls within the DFT period. | `"period_amount"` |

### Examples

**Static default value (e.g., for repeatable item type tracking):**

```json
{
  "name": "challenge_type",
  "type": "text",
  "label": "",
  "show": false,
  "prefill": {
    "source": "defaultValue",
    "path": "new"
  }
}
```

**Organisation detail prefill:**

```json
{
  "name": "org_name",
  "type": "text",
  "label": "Organisation name",
  "prefill": {
    "source": "organisation_detail",
    "path": "organisationName"
  }
}
```

**Funding prefill (locked, read-only):**

```json
{
  "name": "scat_core_grant_funding",
  "type": "currency",
  "label": "SCAT Core Grant funding for this period",
  "required": true,
  "config": { "locked": true },
  "prefill": {
    "source": "core_grant_funding",
    "path": "quarterly_amount"
  }
}
```

### How Funding Prefill Sources Work

The funding prefill sources (`core_grant_funding`, `fris_funding`, `dft_funding`) use the current form's `fundingStart` date to look up related approved forms for the same LDA:

1. **`core_grant_funding`** — Finds the most recently approved `grant_funding` form where `fundingStart ≤ report.fundingStart ≤ fundingEnd`, divides the `amount` by 4
2. **`fris_funding`** — Sums `amount` from all approved `fris_claim` forms where `fundingStart ≤ report.fundingStart ≤ fundingEnd`
3. **`dft_funding`** — Sums `amount` from all approved `dft_application` forms where `fundingStart ≤ report.fundingStart ≤ fundingEnd`

> **Note:** "Approved" means the form's `approved` timestamp is not null.

### Locked Fields

Use `config.locked: true` on currency fields to make them always disabled with a lock icon, regardless of whether the form is in edit mode. This is used for backend-prefilled amounts that users should not modify.

```json
{
  "config": { "locked": true }
}
```

### Computed Fields

Use `config.computed` and `config.sourceFields` to auto-calculate a field's value from other fields across the form. Currently supports `"sum"`.

```json
{
  "name": "total_income",
  "type": "currency",
  "label": "Total income",
  "required": true,
  "config": {
    "locked": true,
    "computed": "sum",
    "sourceFields": [
      "scat_core_grant_funding",
      "grant_funding_secured",
      "donations_sponsorships_secured"
    ]
  }
}
```

- `computed` — Operation to perform. Currently supports `"sum"`
- `sourceFields` — Array of field names (from any section) to sum
- Computed fields are recalculated each time the form loads with updated `defaultValues`
- The computed value is automatically saved to the database when it changes
- Typically combined with `config.locked: true` to prevent manual editing

### Auto-Uncheck Toggle on Change

Use `config.uncheckedOnChange` on a toggle field to automatically uncheck it when any of the listed fields change value. This is useful for confirmation checkboxes that should reset when totals are recalculated.

```json
{
  "name": "totals_confirmation",
  "type": "toggle",
  "layout": "toggle",
  "label": "I confirm the amounts are correct.",
  "required": true,
  "config": {
    "uncheckedOnChange": ["total_income", "total_expenditure"]
  }
}
```

---

## Custom Layouts

### `toggle`

Boolean toggle switch.

```json
{
  "name": "did_not_attend",
  "type": "toggle",
  "layout": "toggle",
  "label": "We did not take attendance for this activity",
  "required": false,
  "prefill": { "path": "false", "source": "defaultValue" }
}
```

### `label-value-list`

Side-by-side label + number inputs with an optional total row. Used with `type: "group"`.

```json
{
  "name": "attendance",
  "type": "group",
  "layout": "label-value-list",
  "label": "Overall attendance",
  "required": true,
  "config": {
    "showTotal": true,
    "totalLabel": "Total attendees"
  },
  "fields": [
    { "name": "adults", "type": "number", "label": "Adults", "placeholder": "Value", "required": true },
    { "name": "children", "type": "number", "label": "Children", "placeholder": "Value", "required": true }
  ]
}
```

### `narrative-repeatable`

Accordion-based repeatable items with dynamic card titles (from name/date fields), complete/incomplete badges, and delete buttons per item.

```json
{
  "name": "activities",
  "type": "repeatable",
  "layout": "narrative-repeatable",
  "label": "Activities",
  "subtitle": "during this reporting period",
  "value": "[]",
  "config": {
    "cardLabel": "Activity",
    "add_button_label": "Add new activity",
    "removeLable": "Delete activity"
  },
  "template": [
    { "name": "name", "type": "text", "label": "Name", "required": true },
    { "name": "date", "type": "date", "label": "Date", "required": true },
    { "name": "description", "type": "textarea", "label": "Description", "required": true }
  ]
}
```

**Config options:**
- `cardLabel` — Default label for each card (e.g., "Activity 1")
- `add_button_label` — Text on the add button
- `removeLable` — Text on the delete button

### `repeatable`

Simple card-based repeatable. Same structure as `narrative-repeatable` but without accordion UI.

```json
{
  "name": "items",
  "type": "repeatable",
  "layout": "repeatable",
  "label": "Items",
  "value": "[]",
  "config": {
    "cardLabel": "Item",
    "add_button_label": "Add",
    "removeLable": "Remove"
  },
  "template": [
    { "name": "field_a", "type": "text", "label": "Field A", "required": true }
  ]
}
```

### `challenges`

Repeatable layout for challenges with support for existing vs new challenges (via `prefill`), resolve/update tracking.

```json
{
  "name": "challenges",
  "type": "repeatable",
  "layout": "challenges",
  "config": {
    "existingChallenges": [],
    "categories": [{ "label": "Category", "value": "cat" }],
    "rootCauseOptions": [{ "label": "Internal", "value": "internal" }],
    "impactOptions": [{ "label": "Organisation", "value": "org" }],
    "add_button_label": "Add new challenge",
    "cardLabel": "Challenge"
  },
  "template": [
    {
      "name": "challenge_type",
      "type": "text",
      "show": false,
      "prefill": { "path": "new", "source": "defaultValue" }
    }
  ]
}
```

### `partnerships`

Repeatable layout for partnerships with support for existing vs new entries (via `prefill`).

```json
{
  "name": "partnerships",
  "type": "repeatable",
  "layout": "partnerships",
  "config": {
    "existingPartnerships": [],
    "partnerTypes": [{ "label": "CBO", "value": "cbo" }],
    "partnershipCategories": [{ "label": "Funding", "value": "funding" }],
    "add_button_label": "Add partnership",
    "cardLabel": "Partnership"
  },
  "template": [
    {
      "name": "partnership_type",
      "type": "text",
      "show": false,
      "prefill": { "path": "new", "source": "defaultValue" }
    }
  ]
}
```

### `activities-funded-list`

Auto-populated read-only list of activities from linked forms.

```json
{
  "name": "funded_activities",
  "type": "text",
  "layout": "activities-funded-list",
  "label": "Activities funded by SCAT funds",
  "config": {
    "formCategories": ["dft_report", "fris_claim"]
  }
}
```

### `casework-categories`

Category-based data grid with configurable columns. Used with `type: "group"`.

```json
{
  "name": "new_cases",
  "type": "group",
  "layout": "casework-categories",
  "label": "New cases opened",
  "config": {
    "statusField": "new_cases_status",
    "headerLabel": "New cases opened during this reporting period",
    "columns": [
      { "name": "client", "label": "Opened (by client)" },
      { "name": "thirdparty", "label": "Opened (by third party)" }
    ],
    "categories": [
      {
        "name": "gender",
        "label": "Gender cases",
        "caseTypes": [
          { "name": "gbv", "label": "Gender based violence" }
        ]
      }
    ]
  },
  "fields": []
}
```

**Requires a hidden status field:**
```json
{ "name": "new_cases_status", "type": "text", "label": "", "show": false }
```

### `finalised-cases`

Extended version of casework-categories with demographics breakdown (gender, race, age) per category.

```json
{
  "name": "finalised_cases",
  "type": "group",
  "layout": "finalised-cases",
  "label": "Cases finalised",
  "config": {
    "statusField": "finalised_cases_status",
    "casesLabel": "Cases finalised",
    "casesColumns": [
      { "name": "referred", "label": "Referred" },
      { "name": "closed", "label": "Closed" }
    ],
    "demographics": [
      {
        "name": "gender",
        "label": "Gender of clients",
        "skipLabel": "We did not gather detailed gender information",
        "columns": [
          { "name": "female", "label": "Female" },
          { "name": "male", "label": "Male" }
        ]
      }
    ],
    "categories": []
  },
  "fields": []
}
```

### `garden-beneficiaries`

Garden-linked layout for tracking employees and beneficiaries with demographics. References a `sourceField` repeatable.

```json
{
  "name": "garden_beneficiaries",
  "type": "group",
  "layout": "garden-beneficiaries",
  "config": {
    "statusField": "garden_beneficiaries_status",
    "sourceField": "community_gardens",
    "gardenNameField": "garden_name",
    "requiredFields": ["garden_name", "garden_size"],
    "employeesLabel": "Employees paid by SCAT funds",
    "employeesColumns": [{ "name": "paid_employees", "label": "Paid employees" }],
    "demographics": [],
    "beneficiariesLabel": "Beneficiaries supported",
    "beneficiariesColumns": [
      { "name": "individuals", "label": "Individuals" },
      { "name": "food_provided", "label": "Food provided (kg)" }
    ]
  },
  "fields": []
}
```

### `garden-yields`

Garden-linked layout for tracking farmed items with configurable columns. References a `sourceField` repeatable.

```json
{
  "name": "garden_yields",
  "type": "group",
  "layout": "garden-yields",
  "config": {
    "statusField": "garden_yields_status",
    "sourceField": "community_gardens",
    "gardenNameField": "garden_name",
    "columns": [
      { "name": "units_planted", "label": "Units planted", "type": "number" },
      { "name": "harvested_kg", "label": "Harvested (kg)", "type": "number" }
    ],
    "farmedItemOptions": ["Carrots", "Tomato", "Spinach"],
    "addButtonLabel": "Add farmed item"
  },
  "fields": []
}
```

### `data-grid`

Generic data grid layout.

```json
{
  "name": "data",
  "type": "group",
  "layout": "data-grid",
  "label": "Data",
  "config": {},
  "fields": []
}
```

---

## File Upload

```json
{
  "name": "document",
  "type": "fileUpload",
  "label": "Upload document",
  "required": true,
  "multiple": true,
  "config": {
    "destination": "media",
    "accepted_file_types": ["image/png", "image/jpeg", "image/jpg"],
    "accept": "image/*",
    "multiple": true
  }
}
```

---

## Info / Guidance Blocks

Use `type: "info"` for read-only content. The `notice` property supports HTML.

```json
{
  "name": "section_intro",
  "type": "info",
  "label": "Section introduction text"
}
```

```json
{
  "name": "section_guidance",
  "type": "info",
  "label": "",
  "notice": "<strong>How should I answer this question?</strong> Detailed guidance here..."
}
```

---

## Complete Example

```json
{
  "title": "Sample Report",
  "sections": [
    {
      "title": "Basic Information",
      "fields": [
        {
          "name": "org_name",
          "type": "text",
          "label": "Organisation name",
          "required": true,
          "placeholder": "Enter name"
        },
        {
          "name": "report_date",
          "type": "date",
          "label": "Report date",
          "required": true
        },
        {
          "name": "has_comments",
          "type": "radio",
          "label": "Do you have additional comments?",
          "options": [
            { "value": "no", "label": "No" },
            { "value": "yes", "label": "Yes" }
          ]
        },
        {
          "name": "comments",
          "type": "textarea",
          "label": "Additional comments",
          "required": true,
          "show_if": { "field": "has_comments", "value": "yes" },
          "placeholder": "Enter comments"
        }
      ]
    },
    {
      "title": "Activities",
      "fields": [
        {
          "name": "activities",
          "type": "repeatable",
          "layout": "narrative-repeatable",
          "label": "Activities",
          "value": "[]",
          "config": {
            "cardLabel": "Activity",
            "add_button_label": "Add activity",
            "removeLable": "Delete activity"
          },
          "template": [
            { "name": "name", "type": "text", "label": "Activity name", "required": true },
            { "name": "date", "type": "date", "label": "Date", "required": true },
            { "name": "notes", "type": "textarea", "label": "Notes", "required": false }
          ]
        }
      ]
    },
    {
      "title": "Admin Review",
      "editable_by": ["SUPER_USER"],
      "visible_to": ["SUPER_USER"],
      "admin_feedback": true,
      "fields": [
        {
          "name": "admin_notes",
          "type": "textarea",
          "label": "Internal notes",
          "required": false
        }
      ]
    }
  ]
}
```

---

## Existing Templates

| File | Description |
|---|---|
| `form-templates/narrative-report.json` | Full narrative report with activities, casework, gardens, challenges, successes, partnerships |
| `form-templates/dft-report.json` | DFT report |
| `form-templates/dft-application.json` | DFT application form |
| `form-templates/fris-application.json` | FRIS application form |
| `form-templates/fris-claim.json` | FRIS claim form |
| `form-templates/grant-funding-application.json` | Grant funding application |
| `form-templates/field-visit-report.json` | Field visit report |
