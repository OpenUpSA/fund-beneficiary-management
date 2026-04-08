/**
 * Form Events System
 * 
 * This module handles form lifecycle events (created, submitted, approved, etc.)
 * and executes registered handlers for each event type.
 */

import prisma from "@/db"
import { FormTemplate, LocalDevelopmentAgencyForm } from "@prisma/client"
import { narrativeReportHandlers } from "./handlers/narrative-report"
import { genericHandlers } from "./handlers/generic"

// Event types that can be triggered during form lifecycle
export type FormEventType = 'created' | 'submitted' | 'approved' | 'rejected' | 'updated'

// Context passed to event handlers
export interface FormEventContext {
  form: LocalDevelopmentAgencyForm
  formTemplate: FormTemplate
  ldaId: number
  userId?: number
}

// Handler function signature
export type FormEventHandler = (context: FormEventContext) => Promise<void>

// Registry of handlers by template category and event type
type HandlerRegistry = {
  [templateCategory: string]: {
    [event in FormEventType]?: FormEventHandler[]
  }
}

// Global handler registry - '*' is for generic handlers that run for ALL forms
const handlerRegistry: HandlerRegistry = {
  '*': genericHandlers,
  'narrative_report': narrativeReportHandlers,
}

/**
 * Trigger a form event and execute all registered handlers
 */
export async function triggerFormEvent(
  eventType: FormEventType,
  form: LocalDevelopmentAgencyForm,
  userId?: number
): Promise<void> {
  // Get the form template to determine which handlers to run
  const formTemplate = await prisma.formTemplate.findUnique({
    where: { id: form.formTemplateId }
  })

  if (!formTemplate) {
    console.warn(`Form template not found for form ${form.id}`)
    return
  }

  const context: FormEventContext = {
    form,
    formTemplate,
    ldaId: form.localDevelopmentAgencyId,
    userId
  }

  // First, run generic handlers that apply to ALL forms
  const genericCategoryHandlers = handlerRegistry['*']
  if (genericCategoryHandlers) {
    const genericEventHandlers = genericCategoryHandlers[eventType]
    if (genericEventHandlers && genericEventHandlers.length > 0) {
      for (const handler of genericEventHandlers) {
        try {
          await handler(context)
        } catch (error) {
          console.error(`Error executing generic form event handler for ${eventType}:`, error)
        }
      }
    }
  }

  // Then, run category-specific handlers
  // Use formCategory if available, otherwise derive from template name
  const category = (formTemplate as { formCategory?: string }).formCategory || 
    formTemplate.name.toLowerCase().replace(/\s+/g, '_') || ''
  const categoryHandlers = handlerRegistry[category]
  
  if (!categoryHandlers) {
    return // No handlers registered for this category
  }

  const eventHandlers = categoryHandlers[eventType]
  if (!eventHandlers || eventHandlers.length === 0) {
    return // No handlers for this event type
  }

  // Execute all handlers
  for (const handler of eventHandlers) {
    try {
      await handler(context)
    } catch (error) {
      console.error(`Error executing form event handler for ${category}/${eventType}:`, error)
      // Continue with other handlers even if one fails
    }
  }
}

/**
 * Register a new handler for a specific template category and event type
 */
export function registerFormEventHandler(
  templateCategory: string,
  eventType: FormEventType,
  handler: FormEventHandler
): void {
  if (!handlerRegistry[templateCategory]) {
    handlerRegistry[templateCategory] = {}
  }
  
  if (!handlerRegistry[templateCategory][eventType]) {
    handlerRegistry[templateCategory][eventType] = []
  }
  
  handlerRegistry[templateCategory][eventType]!.push(handler)
}
