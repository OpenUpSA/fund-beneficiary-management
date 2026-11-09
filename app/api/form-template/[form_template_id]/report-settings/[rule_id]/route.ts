import { NextRequest, NextResponse } from "next/server"
import prisma from "@/db"
import { getServerSession } from "next-auth"
import { NEXT_AUTH_OPTIONS } from "@/lib/auth"
import { permissions } from "@/lib/permissions"
import { OVERRIDE_FIELDS, reportOverrideInputError } from "@/lib/report-rules"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type Params = { params: { form_template_id: string; rule_id: string } }

async function load({ params }: Params) {
  const session = await getServerSession(NEXT_AUTH_OPTIONS)
  if (!session?.user) {
    return { response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) }
  }
  if (!permissions.isSuperUser(session.user)) {
    return { response: NextResponse.json({ error: "Permission denied" }, { status: 403 }) }
  }
  const templateId = Number(params.form_template_id)
  const ruleId = Number(params.rule_id)
  const [template, rule] = await Promise.all([
    Number.isSafeInteger(templateId)
      ? prisma.formTemplate.findUnique({ where: { id: templateId }, select: { id: true, formCategoryId: true } })
      : null,
    Number.isSafeInteger(ruleId) ? prisma.reportRule.findUnique({ where: { id: ruleId } }) : null,
  ])
  if (!template || !rule) {
    return { response: NextResponse.json({ error: "Form template or report rule not found" }, { status: 404 }) }
  }
  // Only rules of the template's own category apply to its forms
  if (rule.parentCategoryId !== template.formCategoryId) {
    return { response: NextResponse.json({ error: "This rule doesn't belong to the template's category" }, { status: 400 }) }
  }
  return { template, rule }
}

/**
 * Save this template's changes to a rule. Every field is sent: a value overrides
 * the rule, null inherits it. All nulls removes the override.
 */
export async function PUT(req: NextRequest, context: Params) {
  const { template, rule, response } = await load(context)
  if (!template || !rule) return response

  try {
    const body = await req.json()
    const data = Object.fromEntries(OVERRIDE_FIELDS.map((field) => [field, body[field] ?? null]))
    const error = await reportOverrideInputError(data, rule)
    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    const where = { reportRuleId_formTemplateId: { reportRuleId: rule.id, formTemplateId: template.id } }
    if (Object.values(data).every((value) => value === null)) {
      await prisma.reportRuleOverride.deleteMany({ where: { reportRuleId: rule.id, formTemplateId: template.id } })
      return NextResponse.json({ override: null })
    }
    const override = await prisma.reportRuleOverride.upsert({
      where,
      create: { ...data, reportRuleId: rule.id, formTemplateId: template.id },
      update: data,
    })
    return NextResponse.json({ override })
  } catch (error) {
    console.error("Failed to save report settings:", error)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }
}
