import type { JSONSchema7 } from "json-schema"

/**
 * JSON Schema for the form template format rendered by
 * components/form-templates/. Drives validation, hovers, and autocomplete in
 * the template editor. Reference: docs/FORM_TEMPLATES.md.
 *
 * Sections and fields reject unknown properties so typos are caught — when a
 * new property is introduced in the renderer, add it here too.
 */

const ROLES = ["USER", "PROGRAMME_OFFICER", "ADMIN", "SUPER_USER"]

const FIELD_TYPES = [
  "string", "number", "textarea", "email", "text", "radio", "group", "select",
  "date", "currency", "repeatable", "multiselect", "fileUpload", "toggle",
  "info", "checkbox", "data-table", "custom",
]

const PREFILL_SOURCES = [
  "organisation", "organisation_detail", "organisation_operations",
  "organisation_staff", "linkedForm", "core_grant_funding", "carryover_amount",
  "defaultValue", "fris_funding", "dft_funding",
]

const KNOWN_LAYOUTS = [
  "data-table", "label-value-list", "repeatable", "toggle", "heading",
  "narrative-repeatable", "activities-funded-list", "finance-totals",
  "challenges", "partnerships", "casework-categories", "finalised-cases",
  "garden-beneficiaries", "garden-yields",
]

const option: JSONSchema7 = {
  type: "object",
  required: ["label", "value"],
  properties: {
    label: { type: "string", description: "Text shown to the user" },
    value: { type: "string", description: "Stored value" },
    icon: { type: "string", description: "Lucide icon name" },
  },
  additionalProperties: false,
}

const showIf: JSONSchema7 = {
  type: "object",
  description: "Show this only when another field has a specific value. Toggle fields use string \"true\"/\"false\".",
  required: ["field", "value"],
  properties: {
    field: { type: "string", description: "Name of the field to watch" },
    value: { type: "string", description: "Value that makes this visible" },
    show_by_default: { type: "boolean", description: "Visible before the watched field has a value" },
  },
  additionalProperties: false,
}

const roleArray: JSONSchema7 = {
  type: "array",
  items: { type: "string", enum: ROLES },
}

export const FORM_TEMPLATE_SCHEMA: JSONSchema7 = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Form Template",
  type: "object",
  required: ["title", "sections"],
  properties: {
    title: { type: "string", description: "Form title shown to the user" },
    sections: {
      type: "array",
      items: { $ref: "#/definitions/section" },
    },
  },
  additionalProperties: false,
  definitions: {
    section: {
      type: "object",
      required: ["title", "fields"],
      properties: {
        title: { type: "string", description: "Section heading" },
        description: { type: "string", description: "Explanatory text below the title" },
        notice: { type: "string", description: "Highlighted notice box at the top of the section" },
        tag: { type: "string", description: "Grouping tag shown with the section (e.g. \"Casework\")" },
        editable_by: {
          ...roleArray,
          description: "Roles that can edit this section. Empty array locks the section; omit to allow everyone.",
        },
        visible_to: {
          ...roleArray,
          description: "Roles that can see this section",
        },
        admin_feedback: { type: "boolean", description: "Section is an admin feedback section" },
        selfManagedCompletion: {
          type: "boolean",
          description: "Show Complete/Incomplete driven by a custom layout's hidden *_status field instead of the required-count",
        },
        show_if: { $ref: "#/definitions/showIf" },
        fields: {
          type: "array",
          items: { $ref: "#/definitions/field" },
        },
      },
      additionalProperties: false,
    },
    field: {
      type: "object",
      required: ["name", "type", "label"],
      properties: {
        name: { type: "string", description: "Unique field identifier. Group subfields are stored as {group_name}_{subfield_name}." },
        type: {
          type: "string",
          enum: FIELD_TYPES,
          description: "Field type. Toggle values are stored as strings \"true\"/\"false\".",
        },
        label: { type: "string", description: "Display label" },
        subtitle: { type: "string" },
        description: { type: "string", description: "Helper text below the label" },
        placeholder: { type: "string" },
        notice: { type: "string" },
        required: { type: "boolean" },
        disabled: { type: "boolean", description: "Prevents editing" },
        multiple: { type: "boolean", description: "Allow multiple files (fileUpload)" },
        show: { type: "boolean" },
        icon: { type: "string", description: "Lucide icon name" },
        value: { type: "string", description: "Preset value" },
        core_type: { type: "string" },
        currency: { type: "string", description: "Currency code (e.g. ZAR)" },
        width: { type: "string", enum: ["half", "full"], description: "Column width (default full)" },
        min: { type: "number", description: "Minimum value (number fields)" },
        max: { type: "number", description: "Maximum value (number fields)" },
        maxLength: { type: "number", description: "Maximum text length" },
        default: { type: "number", description: "Initial number of items (repeatable)" },
        item_label: { type: "string", description: "Label for each repeatable item" },
        cardLabel: { type: "string" },
        layout: {
          type: "string",
          description: `Custom layout renderer. Known layouts: ${KNOWN_LAYOUTS.join(", ")}`,
        },
        options: {
          type: "array",
          description: "Static options for select/multiselect/radio",
          items: { $ref: "#/definitions/option" },
        },
        fields: {
          type: "array",
          description: "Subfields (group fields)",
          items: { $ref: "#/definitions/field" },
        },
        template: {
          type: "array",
          description: "Fields repeated for each item (repeatable fields)",
          items: { $ref: "#/definitions/field" },
        },
        show_if: { $ref: "#/definitions/showIf" },
        depends_on: { $ref: "#/definitions/dependsOn" },
        prefill: { $ref: "#/definitions/prefill" },
        config: { $ref: "#/definitions/config" },
        accepted_file_types: {
          type: "array",
          items: { type: "string" },
          description: "MIME types allowed (fileUpload; usually under config)",
        },
      },
      additionalProperties: false,
    },
    option,
    showIf,
    dependsOn: {
      type: "object",
      description: "Change this field's options/label/enabled state based on another field's value",
      required: ["field"],
      properties: {
        field: { type: "string", description: "Name of the field to watch" },
        rules: {
          type: "array",
          items: {
            type: "object",
            required: ["when"],
            properties: {
              when: { type: "string", description: "Watched field value that triggers this rule" },
              label: { type: "string", description: "Label to apply when the rule matches" },
              options: { type: "array", items: { $ref: "#/definitions/option" } },
              enabled: { type: "boolean" },
            },
            additionalProperties: false,
          },
        },
        enabled_when: {
          anyOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
          description: "Watched field value(s) that enable this field",
        },
        disabled_when: {
          anyOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
          description: "Watched field value(s) that disable this field",
        },
        default_disabled: { type: "boolean", description: "Start disabled" },
        default_options: { type: "array", items: { $ref: "#/definitions/option" } },
        label: { type: "string" },
      },
      additionalProperties: false,
    },
    prefill: {
      type: "object",
      description: "Pre-populate this field from organisation data or a linked form",
      required: ["source", "path"],
      properties: {
        source: {
          type: "string",
          enum: PREFILL_SOURCES,
          description: "Data source resolved in /api/lda-form/[lda_form_id]",
        },
        path: { type: "string", description: "Property or field name within the source" },
      },
      additionalProperties: false,
    },
    config: {
      type: "object",
      description: "Component-specific configuration",
      properties: {
        destination: { type: "string", enum: ["media", "document"], description: "Upload API endpoint (fileUpload)" },
        accepted_file_types: { type: "array", items: { type: "string" }, description: "Allowed MIME types (fileUpload)" },
        accept: { type: "string", description: "Accept attribute pattern, e.g. image/*" },
        multiple: { type: "boolean" },
        dynamicOptionTable: {
          type: "string",
          enum: ["funders", "staff_members", "committee_members", "focus_areas"],
          description: "Fetch options dynamically instead of static options",
        },
        columns: {
          type: "array",
          description: "Columns for data-table and custom layouts. data-table uses {label, value}; custom layouts use {name, label, type, tooltip}.",
          items: {
            type: "object",
            required: ["label"],
            properties: {
              label: { type: "string" },
              value: { type: "string", description: "Source property (data-table)" },
              name: { type: "string", description: "Column key (custom layouts)" },
              type: { type: "string" },
              tooltip: { type: "string" },
            },
            additionalProperties: true,
          },
        },
        showTotal: { type: "boolean", description: "Show computed total row (label-value-list)" },
        totalLabel: { type: "string", description: "Label for the total row" },
        locked: { type: "boolean" },
        computed: { type: "string", description: "Computed value type, e.g. sum" },
        add_button_label: { type: "string", description: "Add button text (repeatable)" },
        cardLabel: { type: "string", description: "Card header prefix (repeatable)" },
        removeLable: { type: "string", description: "Remove button text (repeatable; note historical spelling)" },
        statusField: { type: "string", description: "Hidden field driving selfManagedCompletion" },
      },
      additionalProperties: true,
    },
  },
}
