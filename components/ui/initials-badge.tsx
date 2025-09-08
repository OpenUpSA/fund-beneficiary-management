"use client"

import React from 'react'
import { Badge } from "@/components/ui/badge"

interface InitialsBadgeProps {
  name: string
  title?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'outline' | 'secondary'
}

export function InitialsBadge({ 
  name, 
  title, 
  className = "", 
  size = 'md',
  variant = 'outline'
}: InitialsBadgeProps) {
  const getInitials = (name: string) => {
    if (!name) return ""
    return name.split(" ").map(w => w[0]).join("")
  }

  const sizeClasses = {
    sm: "w-5 h-5 text-xs",
    md: "w-6 h-6 text-xs",
    lg: "w-8 h-8 text-sm"
  }

  return (
    <Badge
      variant={variant}
      className={`text-slate-700 border-slate-200 border rounded-full ${sizeClasses[size]} flex items-center justify-center p-0 ${className}`}
      title={title || name}
    >
      {getInitials(name)}
    </Badge>
  )
}
