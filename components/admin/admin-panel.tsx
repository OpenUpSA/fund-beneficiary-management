"use client"

import { useState } from "react"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  FilePlus, 
  ChevronRight, 
  Layers, 
  Target, 
  FileCheck, 
  Wallet, 
  Calendar, 
  Database, 
  MapPin 
} from "lucide-react"
import { FormTemplateWithRelations, LocalDevelopmentAgencyFull } from "@/types/models"
import { CreateFormPanel } from "./create-form-panel"
import { CrudPanel, FieldConfig } from "./crud-panel"
import { ReportSchedulesPanel } from "./report-schedules-panel"
import { CacheManagementPanel } from "./cache-management-panel"
import { ProvincesPanel } from "./provinces-panel"
import { cn } from "@/lib/utils"

interface AdminPanelProps {
  ldas: LocalDevelopmentAgencyFull[]
  formTemplates: FormTemplateWithRelations[]
}

type AdminTool = 
  | 'create-form' 
  | 'development-stages' 
  | 'focus-areas' 
  | 'form-status' 
  | 'funding-status'
  | 'report-schedules'
  | 'cache-management'
  | 'provinces'
  | null

interface ToolOption {
  id: AdminTool
  title: string
  description: string
  icon: React.ElementType
  category: 'forms' | 'data' | 'system'
}

const toolOptions: ToolOption[] = [
  {
    id: 'create-form',
    title: 'Create Form',
    description: 'Create a new form for any LDA with any active template',
    icon: FilePlus,
    category: 'forms',
  },
  {
    id: 'report-schedules',
    title: 'Report Schedules',
    description: 'View and manage upcoming report schedules',
    icon: Calendar,
    category: 'forms',
  },
  {
    id: 'development-stages',
    title: 'Development Stages',
    description: 'Manage organization development stages',
    icon: Layers,
    category: 'data',
  },
  {
    id: 'focus-areas',
    title: 'Focus Areas',
    description: 'Manage focus areas for funds and organizations',
    icon: Target,
    category: 'data',
  },
  {
    id: 'form-status',
    title: 'Form Statuses',
    description: 'Manage form status options',
    icon: FileCheck,
    category: 'data',
  },
  {
    id: 'funding-status',
    title: 'Funding Statuses',
    description: 'Manage funding status options',
    icon: Wallet,
    category: 'data',
  },
  {
    id: 'provinces',
    title: 'Provinces & Districts',
    description: 'Manage provinces and their districts',
    icon: MapPin,
    category: 'data',
  },
  {
    id: 'cache-management',
    title: 'Cache Management',
    description: 'View and flush API caches',
    icon: Database,
    category: 'system',
  },
]

// Field configurations for CRUD panels
const crudConfigs: Record<string, { apiEndpoint: string; fields: FieldConfig[]; title: string; description: string }> = {
  'development-stages': {
    apiEndpoint: '/api/development-stage',
    title: 'Development Stages',
    description: 'Manage organization development stages',
    fields: [
      { name: 'label', label: 'Label', type: 'text', required: true, placeholder: 'e.g., Emerging' },
      { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Description of this stage' },
    ],
  },
  'focus-areas': {
    apiEndpoint: '/api/focus-area',
    title: 'Focus Areas',
    description: 'Manage focus areas for funds and organizations',
    fields: [
      { name: 'label', label: 'Label', type: 'text', required: true, placeholder: 'e.g., Education' },
      { name: 'icon', label: 'Icon', type: 'text', placeholder: 'Lucide icon name (e.g., book)' },
    ],
  },
  'form-status': {
    apiEndpoint: '/api/form-status',
    title: 'Form Statuses',
    description: 'Manage form status options',
    fields: [
      { name: 'label', label: 'Label', type: 'text', required: true, placeholder: 'e.g., Draft' },
      { name: 'icon', label: 'Icon', type: 'text', placeholder: 'Lucide icon name' },
    ],
  },
  'funding-status': {
    apiEndpoint: '/api/funding-status',
    title: 'Funding Statuses',
    description: 'Manage funding status options',
    fields: [
      { name: 'label', label: 'Label', type: 'text', required: true, placeholder: 'e.g., Active' },
      { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Description of this status' },
    ],
  },
}

export function AdminPanel({ ldas, formTemplates }: AdminPanelProps) {
  const [selectedTool, setSelectedTool] = useState<AdminTool>(null)

  const renderToolContent = () => {
    switch (selectedTool) {
      case 'create-form':
        return <CreateFormPanel ldas={ldas} formTemplates={formTemplates} onBack={() => setSelectedTool(null)} />
      
      case 'report-schedules':
        return <ReportSchedulesPanel ldas={ldas} onBack={() => setSelectedTool(null)} />
      
      case 'cache-management':
        return <CacheManagementPanel onBack={() => setSelectedTool(null)} />
      
      case 'provinces':
        return <ProvincesPanel onBack={() => setSelectedTool(null)} />
      
      case 'development-stages':
      case 'focus-areas':
      case 'form-status':
      case 'funding-status':
        const config = crudConfigs[selectedTool]
        const toolOption = toolOptions.find(t => t.id === selectedTool)
        return (
          <CrudPanel
            title={config.title}
            description={config.description}
            icon={toolOption?.icon || Layers}
            apiEndpoint={config.apiEndpoint}
            fields={config.fields}
            onBack={() => setSelectedTool(null)}
          />
        )
      
      default:
        return null
    }
  }

  if (selectedTool) {
    return renderToolContent()
  }

  // Group tools by category
  const categories = {
    forms: { label: 'Forms & Reports', tools: toolOptions.filter(t => t.category === 'forms') },
    data: { label: 'Data Management', tools: toolOptions.filter(t => t.category === 'data') },
    system: { label: 'System', tools: toolOptions.filter(t => t.category === 'system') },
  }

  return (
    <div className="space-y-8">
      {Object.entries(categories).map(([key, { label, tools }]) => (
        <div key={key}>
          <h2 className="text-lg font-semibold mb-4 text-muted-foreground">{label}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => {
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
      ))}
    </div>
  )
}
