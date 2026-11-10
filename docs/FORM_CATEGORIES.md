# Form categories and reports

Every form template belongs to a **category** (Grant Funding, DFT Application,
Narrative Report, …). The category decides where its forms sit in an LDA's
forms list and which reports they get. Templates never point at each other, so
next year's template slots in by picking the same category.

```
Grant Funding Application (2026)       2026  Application  Approved
  Narrative Report – Q1 2026           Q1    Report
  Finance Report – Q1 2026             Q1    Report
  DFT Application                      Q3    Application  Approved
    DFT Report                         Q3    Report       Draft
Grant Funding Application (2027)       2027  Application  Under review
```

Set up on **Form templates → Categories** or **Admin Tools → Form Categories**
(super users). The page lists what still **needs attention** at the top: report
categories without timing or an active template, reports not attached anywhere,
and templates without a category. Code: `lib/primary-form.ts`
(placement), `lib/report-timing.ts` (period maths), `lib/report-rules.ts`
(planning and creating reports), `lib/form-tree.ts` (the list).

## Categories

| Role | Example | Where its forms sit |
|---|---|---|
| Primary | Grant Funding | Top level. An LDA can't have two of the same category with overlapping dates (Rejected ones don't count). |
| Secondary | DFT Application, under Grant Funding | Under the LDA's primary form of the parent category whose start–end dates include the form's start date. Any number per period. |
| Report | Narrative Report | Under the form it was created for. |

A template's **type** (application or report) follows its category: templates
in report categories are reports, the others applications. Only a template
without a category has its type chosen by hand.

Each category has an internal **key** made from its label when it's created
(e.g. `grant_funding`), which code uses for some lookups such as prefills; it
isn't shown and never changes. Changing a category's role or parent, or a
template's category, regroups existing forms straight away.

## Reports

Reports are set up in three layers, and each form then has its own planned
reports with real dates:

```
Report category timing  →  template changes  →  the form's planned reports  →  report forms
(Reports tab)              (template → Reports)  (worked out when it's created)
```

### Timing on the report category

Each report category (Reports tab) has its timing:

| When | Creates | Dates |
|---|---|---|
| **Once, after a status** (e.g. Approved; Under review = on submission) | One report when the form reaches the status | Due N days after that day; same start/end as the form |
| **Quarterly / Half-yearly / Yearly** | One report per period of the form's **own** start–end dates (an April–March grant's Q1 is April–June) | Opens N days before the period ends, due N days after it ends |

Quarters and halves are numbered from the form's start and restart every 12
months; the year is the one the period starts in (a two-year April grant: Q1
2026 … Q4 2027 (Jan–Mar), then Q1 2027 (Apr–Jun) …).

A primary or secondary category gets a report by **attaching** the report
category (Applications tab → Reports → Attach report). The link has no timing of
its own. Detaching it stops forms getting the report: planned reports for
periods that haven't ended are removed; reports already created stay.

- "Reached" means the status itself or any approved status after it
  (Approved, Underway). Draft, Rejected and Paused forms never get new reports.
- Reports use the **newest active template in the report category**. For a new
  year, add the new template to the report category and deactivate the old one.

### Per-template changes

A template can change two things for its own forms (Categories page → the
template's report link, or **Reports** in the template editor): **switch a
report off**, or **create it at a different status**. Frequency and days always
come from the report category. Cloning a template copies its changes.

Example: DFT Report is created on approval. For a few LDAs it should come on
submission, so clone the DFT Application template as "DFT Application – on
submission", change the trigger to "Under review (submitted)", and create those
LDAs' forms from it.

### Planned reports on each form

When a form is created, its reports are **planned** from the settings above:
one row per period (or one after-status row) with its period, opening date and
due date. They aren't shown on the form; each becomes a report form when it
opens.

Super users (who see Admin Tools) can see and change them: **Reports** in a
form's ⋯ menu in the forms list lists every report it gets, planned and
created. A report not created yet can have its **period, opening date, due date
and label** changed (the label shows in the Year / Quarter column and the
report's title), or be **skipped** for that form (e.g. a quarter that isn't
needed; Unskip plans it again). Changed and skipped reports are **never
re-planned** by settings or date changes, and skipped ones are never created.

**Settings changes reach existing forms straight away.** Saving a report
category's timing, attaching a report, a template's change, or moving a
template to another category re-plans the affected forms. Before saving, the
screen says how many running forms will change and asks to confirm (no question
when none would):

- only forms still running (end date today or later); finished grants stay;
- only periods that haven't ended; past periods stay as they were;
- reports already created, skipped or changed by hand never change, and no new
  period is planned over them. (So switching quarterly → half-yearly mid-year keeps the past quarter
  and skips a half-year that would overlap it.)

A newly planned report that is already open (e.g. attaching a report to a grant
that's already approved) is created by the next daily run, or Admin → Reports →
Run now.

Changing a form's own start/end dates re-plans it the same way, but over its
whole period; the form page asks first when it has upcoming reports. Detaching
a report asks too, saying how many upcoming reports it removes.

Once created, a planned report links to its report form, which is edited like
any form. Rejecting the parent rejects its after-status reports; moving it back
pauses them; reaching the status again reopens them. Approved reports are left
alone.

## The daily job

`/api/cron/generate-reports` creates every planned report whose opening date
has passed and whose form has reached its trigger. Missed days are caught up and
running it twice creates nothing new. After-status reports are also created
straight away when the form's status changes.

- **Production:** `app.json` declares a Dokku cron (02:00 UTC daily) that calls
  the endpoint with `Authorization: Bearer $CRON_SECRET`. Set the secret with
  `dokku config:set <app> CRON_SECRET=…` and check `dokku cron:list <app>`.
- **By hand:** Admin → Reports → Run now (super users). The same panel lists
  the reports opening in the next 90 days, filtered by LDA and form.

## Form titles

Every form has a title, filled in automatically from the template name and the
period the forms list shows in Year / Quarter: `Grant Funding Application –
2026` for a top-level form, `DFT Application – Q2` under it, `Narrative Report –
H1 2026` for a planned report. The period is left off when the template name
already contains it. The title follows the form's dates and grouping until
someone changes it: **Edit** in the form's ⋯ menu in the forms list (the title
for anyone who can fill in or approve the form; its start and end dates too for
approvers, when the template uses them), or the optional title when adding a
form. Saving an empty title goes back to the automatic one. The form page's
heading shows the title, and the card under it the template.

## After deploying

The old per-template report settings ("Linked form template" and report
schedules) were never used and have been removed, database columns and tables
included; reports are set up only on the Categories page.

1. Give every template a category on the Categories page (the "Needs attention"
   list shows any without one), set the report categories' timing and attach
   them.
2. `yarn plan-reports` (dry run, then `--commit`) to plan existing forms' reports.
3. `yarn link-primary-forms` (dry run, then `--commit`) to group existing forms.
4. `yarn refresh-titles` (dry run, then `--commit`) to give existing forms their
   automatic titles (titles changed by hand are kept).
