// Before a save that changes existing forms' upcoming reports, say how many and
// ask. Nothing affected: no question. Browser only.

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

async function affected(query: string): Promise<{ forms?: number; reports?: number } | null> {
  try {
    const response = await fetch(`/api/report-rule/affected?${query}`)
    return response.ok ? await response.json() : null
  } catch {
    return null
  }
}

/** Settings changes (report timing, attaching, a template's changes or category): asks when running forms would change. */
export async function confirmSettingsReplan(query: string): Promise<boolean> {
  const result = await affected(query)
  if (result === null) {
    return window.confirm("This may change the upcoming reports of existing forms. Continue?")
  }
  const forms = result.forms ?? 0
  if (forms === 0) return true
  return window.confirm(
    `This updates the upcoming reports of ${plural(forms, "running form")}. ` +
    "Reports already created or edited by hand won't change. Continue?"
  )
}

/** A form's own start/end date change: asks when it has upcoming reports that would be re-planned. */
export async function confirmDateReplan(formId: number): Promise<boolean> {
  const result = await affected(`formId=${formId}`)
  const reports = result?.reports ?? 0
  if (reports === 0) return true
  return window.confirm(
    `New dates re-plan ${plural(reports, "upcoming report")} of this form. ` +
    "Reports already created or edited by hand won't change. Continue?"
  )
}

/** How many planned reports detaching would remove (0 if unknown). */
export async function detachCount(ruleId: number): Promise<number> {
  return (await affected(`ruleId=${ruleId}`))?.reports ?? 0
}
