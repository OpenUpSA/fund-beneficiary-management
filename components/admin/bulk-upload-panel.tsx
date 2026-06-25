"use client"

import { useState } from "react"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ChevronRight, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { BulkUserUploadPanel } from "./bulk-user-upload-panel"

interface BulkUploadPanelProps {
  onBack: () => void
}

type BulkUploadTool = "user-upload" | null

interface ToolOption {
  id: Exclude<BulkUploadTool, null>
  title: string
  description: string
  icon: React.ElementType
}

const toolOptions: ToolOption[] = [
  {
    id: "user-upload",
    title: "User Upload",
    description: "Create users in bulk from a CSV file, linked to existing organisations",
    icon: Users,
  },
]

export function BulkUploadPanel({ onBack }: BulkUploadPanelProps) {
  const [selectedTool, setSelectedTool] = useState<BulkUploadTool>(null)

  if (selectedTool === "user-upload") {
    return <BulkUserUploadPanel onBack={() => setSelectedTool(null)} />
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Admin Tools
      </Button>

      <div>
        <h2 className="text-lg font-semibold mb-1">Bulk Upload</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Import records in bulk from a file.
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {toolOptions.map((tool) => {
            const Icon = tool.icon
            return (
              <Card
                key={tool.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
                  "group"
                )}
                onClick={() => setSelectedTool(tool.id)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      {tool.title}
                    </span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </CardTitle>
                  <CardDescription>{tool.description}</CardDescription>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
