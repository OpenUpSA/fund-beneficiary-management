"use client"

import { Field } from "@/types/forms"

interface GroupFieldProps {
  field: Field
  isEditing: boolean
  onValueChange?: (field: Field, value: string) => void
}

export function GroupField({}: GroupFieldProps) {
  // Group fields are handled differently, typically as containers for other fields
  // This component returns an empty fragment as the actual rendering is handled in FormLayout
  // We still accept the props to satisfy TypeScript, even though we don't use them
  return <></>
}
