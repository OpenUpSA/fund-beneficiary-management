"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DynamicIcon } from "@/components/dynamicIcon"
import { LucideIcon } from "lucide-react"

interface BarItem {
  label: string
  short?: string
  icon?: string
  count: number
}

interface HorizontalBarChartProps {
  title: string
  icon?: LucideIcon
  items: BarItem[]
  maxItems?: number
  showIcons?: boolean
}

// The largest value fills to this fraction of the track; the track itself spans
// the full width and the fill overlays it.
const MAX_BAR_WIDTH = 80

export function HorizontalBarChart({ title, icon: Icon, items, maxItems = 10, showIcons = false }: HorizontalBarChartProps) {
  const displayItems = items.slice(0, maxItems)
  const maxCount = Math.max(...displayItems.map(item => item.count), 1)

  return (
    <Card className="bg-white">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {displayItems.map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              {/* Icon or short label */}
              <div className="w-10 h-8 flex items-center justify-center border border-gray-200 rounded-md bg-white">
                {showIcons && item.icon ? (
                  <DynamicIcon name={item.icon} size={18} className="text-gray-600 m-0" />
                ) : (
                  <span className="text-xs text-muted-foreground font-medium">
                    {item.short || item.label.slice(0, 3).toUpperCase()}
                  </span>
                )}
              </div>
              {/* Value and bar */}
              <div className="flex-1 flex items-center">
                {/* Full-width background track */}
                <div className="relative flex-1 h-6 bg-slate-50 rounded-[3px] overflow-hidden">
                  {/* Fill overlay — largest value reaches MAX_BAR_WIDTH%; a slate-700
                      end line marks the bar's end (hidden when the value is 0) */}
                  <div
                    className={`absolute inset-y-0 left-0 bg-slate-200 rounded-[2px] ${item.count > 0 ? "border-r-2 border-slate-700" : ""}`}
                    style={{ width: `${(item.count / maxCount) * MAX_BAR_WIDTH}%` }}
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center px-3">
                    <span className="text-sm font-medium text-gray-700">{item.count}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No data available</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
