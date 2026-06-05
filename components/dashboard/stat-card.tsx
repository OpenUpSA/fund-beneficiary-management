"use client"

import { Card, CardContent } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  icon?: LucideIcon
  format?: "number" | "currency"
}

export function StatCard({ title, value, icon: Icon, format = "number" }: StatCardProps) {
  const formattedValue = format === "currency" 
    ? `R${Number(value).toLocaleString("en-ZA")}`
    : typeof value === "number" ? value.toLocaleString("en-ZA") : value

  return (
    <Card className="bg-white">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <p className="text-sm text-muted-foreground">{title}</p>
          {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
        </div>
        <p className="text-3xl font-bold mt-2">{formattedValue}</p>
      </CardContent>
    </Card>
  )
}
