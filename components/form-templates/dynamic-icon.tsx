"use client"

import * as LucideIcons from "lucide-react"
import { LucideProps } from "lucide-react"

interface DynamicIconProps extends LucideProps {
  name: string
}

export function DynamicIcon({ name, ...props }: DynamicIconProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const icons = LucideIcons as any
  const IconComponent = icons[name]
  
  if (!IconComponent) {
    return null
  }
  
  return <IconComponent {...props} />
}
