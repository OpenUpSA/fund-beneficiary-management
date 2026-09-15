# SOAR Grant Funding Application: 2027

Requested by Anastacia Pila (SCAT), cc Nokukhanya Mchunu. Target release:
before 25 September 2026 and before Gaurav's leave.

## Content

Use `form-templates/grant-funding-application-2027.json` for the new cycle.
The existing `grant-funding-application.json` is unchanged.

- JSON title: `Grant Funding Application` (year-independent).
- Revised Gender Equity and Youth Empowerment questions using SCAT's exact wording.
- Added Access to Justice, Food Security and Local Economic Development, and
  local government accountability questions as required textareas, consistent
  with the existing Strategic Focus Areas questions.
- Retained the climate question and all existing prefills.
- Removed year suffixes from the four budget and expenditure field names.
  Renamed the two address `city` fields to `physicalCity` and `postalCity` so
  every field name in the new template is unique.
- Updated the section notice to distinguish prefilled information from new answers.

The source JSON already uses `{{year}}` and funding-period placeholders in its
question text; it contains no visible 2026 references. Those placeholders remain
dynamic in the new version. `{{year}}` comes from the form instance's funding
start date (falling back to its end date), not the current calendar year or the
template name. The new template uses year-independent storage keys:
`budget_total_income`, `budget_total_expenditure`, `income_9_months`, and
`expenditure_9_months`. These replace the original `_2025` keys only in the new
template. Existing forms retain their old keys and original template; their
saved responses are not migrated by this JSON change.

## Apply In SOAR

Deploying repository JSON does not automatically update database templates.

1. Compare the current SOAR template JSON with the repository version before
   applying it, preserving any additional live-only questions or configuration.
2. Clone the existing grant application template with the name
   `Grant Funding Application (2027)`. Keep historical forms attached to the old
   template; changing its JSON would also change what those forms render.
3. In the cloned template's JSON editor, apply the new JSON and save it. The JSON
   title is year-independent; the database template name identifies the cycle.
4. Verify the template category, sidebar settings, linked template, and role
   permissions against the source. The current clone API does not copy
   `formCategory`, `readRoles`, `fillRoles`, or `approveRoles`; set these explicitly.
5. Review cloned report configurations and period schedules. Cloning preserves
   their original years and dates; it does not advance them to 2027.
6. Assign new applications to the 2027 template with the intended funding dates.
   Check that dynamic years and period text match those dates. The JSON title
   does not set or change the form's funding dates.
7. Preview an application, check all six Strategic Focus Areas questions, and
   verify that a historical application still uses its original template.

This branch prepares the JSON and release instructions only. It does not mutate
database templates, reassign existing forms, or generate report schedules.
