# Primary forms

An LDA's forms list is grouped as a tree: each **primary form** (e.g. that
year's Grant Funding Application) with the forms of its funding period nested
under it, and linked forms (e.g. a DFT Report) under the form they came from.

```
Grant Funding Application (2026)        2026   Application
  Narrative Report                       Q2     Report
  DFT Application                        Q2     Application
    DFT Report                           Q2     Report
```

## Setting it up (once per kind of form)

In the form template dialog:

| Template | Form category | Primary form | Group under primary form |
|---|---|---|---|
| Grant Funding Application (any year) | Grant Funding | on | — |
| DFT Application | DFT Application | off | Grant Funding |
| Narrative Report, Finance Report, … | their own | off | Grant Funding |

- A primary template needs a **form category**: that's what ties the yearly
  versions together.
- Templates point at a primary **category**, never at a specific template, so
  nothing needs re-wiring when the year changes.
- Saving these settings regroups existing forms straight away.

## How a form is placed

Rules live in [lib/primary-form.ts](../lib/primary-form.ts); the result is
stored in `LocalDevelopmentAgencyForm.primaryFormId`.

1. A primary form is never grouped under another form.
2. A linked form follows its parent: under the parent if the parent is
   primary, otherwise under the parent's primary.
3. Any other form goes under the LDA's primary form of its template's
   "group under" category whose start–end dates include the form's **start
   date**. No match → it stays at the top level.
4. Rejected primary forms are ignored.

Forms are placed when they're created (including linked forms and scheduled
reports) and again when their dates change. Creating a primary form gathers the
LDA's ungrouped forms that fall in its period, so the order in which forms are
created doesn't matter.

An LDA can't have two primary forms of the same category with overlapping
dates; creating or re-dating one that would overlap is refused. Different
categories (e.g. Grant Funding and FRIS) may share dates.

## When the year changes

Clone last year's primary template (e.g. "Grant Funding Application 2026" →
"… 2027"). The clone keeps the form category and the primary setting, so
forms dated in the new year land under the new year's primary form, and last
year's stay where they are. Cloned secondary templates keep their "group under"
category too.

## Existing data

```bash
yarn link-primary-forms            # dry run: prints every move and any overlapping primaries
yarn link-primary-forms --commit   # apply
```

Run it after deploying the migration and setting up the templates (saving the
template settings already regroups, so this is mainly for checking), or after
editing form dates directly in the database.
