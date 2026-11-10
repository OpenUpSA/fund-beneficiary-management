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
  Camera,
  Database,
  MapPin,
  Upload,
  LayoutTemplate,
  FileDown,
  FolderTree
} from "lucide-react"
import { Link } from "@/i18n/routing"
import { FormTemplateWithRelations, LocalDevelopmentAgencyListItem } from "@/types/models"
import { CreateFormPanel } from "./create-form-panel"
import { ExportResponsesPanel } from "./export-responses-panel"
import { CrudPanel, FieldConfig } from "./crud-panel"
import { ReportsPanel } from "./reports-panel"
import { CacheManagementPanel } from "./cache-management-panel"
import { ProvincesPanel } from "./provinces-panel"
import { BulkUploadPanel } from "./bulk-upload-panel"
import { cn } from "@/lib/utils"

interface AdminPanelProps {
  ldas: LocalDevelopmentAgencyListItem[]
  formTemplates: FormTemplateWithRelations[]
}

type AdminTool =
  | 'form-templates'
  | 'form-categories'
  | 'assign-form'
  | 'export-responses'
  | 'development-stages'
  | 'focus-areas'
  | 'form-status'
  | 'funding-status'
  | 'media-source-types'
  | 'report-schedules'
  | 'cache-management'
  | 'provinces'
  | 'bulk-upload'
  | null

interface ToolOption {
  id: AdminTool
  title: string
  description: string
  icon: React.ElementType
  category: 'forms' | 'data' | 'bulk' | 'system'
  // Opens this page instead of a panel here, so there's one place to manage it
  href?: string
}

const toolOptions: ToolOption[] = [
  {
    id: 'form-templates',
    title: 'Form Templates',
    description: 'Build and manage form templates — sections, fields, and access',
    icon: LayoutTemplate,
    category: 'forms',
    href: '/dashboard/form-templates',
  },
  {
    id: 'form-categories',
    title: 'Form Categories',
    description: 'Group templates, attach reports and set when reports are due',
    icon: FolderTree,
    category: 'forms',
    href: '/dashboard/form-templates/categories',
  },
  {
    id: 'assign-form',
    title: 'Assign Form',
    description: 'Assign a form to any LDA from any active template',
    icon: FilePlus,
    category: 'forms',
  },
  {
    id: 'export-responses',
    title: 'Export Responses',
    description: 'Export individual or selected form responses as a spreadsheet',
    icon: FileDown,
    category: 'bulk',
  },
  {
    id: 'report-schedules',
    title: 'Reports',
    description: 'Run report generation and see which reports open next',
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
    id: 'media-source-types',
    title: 'Media Source Types',
    description: 'Manage source type options for media',
    icon: Camera,
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
    id: 'bulk-upload',
    title: 'Bulk Upload',
    description: 'Import records in bulk from a file (e.g. users)',
    icon: Upload,
    category: 'bulk',
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
const crudConfigs: Record<string, { apiEndpoint: string; fields: FieldConfig[]; title: string; description: string; displayField?: string }> = {
  'development-stages': {
    apiEndpoint: '/api/development-stage',
    title: 'Development Stages',
    description: 'Manage organization development stages',
    fields: [
      { name: 'label', label: 'Label', type: 'text', required: true, placeholder: 'e.g., Emerging' },
      { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Description of this stage' },
      { name: 'icon', label: 'Icon', type: 'text', placeholder: 'Lucide icon name (e.g., sprout)' },
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
  'media-source-types': {
    apiEndpoint: '/api/media-source-type',
    title: 'Media Source Types',
    description: 'Manage source type options for media (e.g. Uploaded, Report)',
    displayField: 'title',
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, placeholder: 'e.g., Uploaded' },
    ],
  },
}

export function AdminPanel({ ldas, formTemplates }: AdminPanelProps) {
  const [selectedTool, setSelectedTool] = useState<AdminTool>(null)

  const renderToolContent = () => {
    switch (selectedTool) {
      case 'assign-form':
        return <CreateFormPanel ldas={ldas} formTemplates={formTemplates} onBack={() => setSelectedTool(null)} />

      case 'export-responses':
        return <ExportResponsesPanel formTemplates={formTemplates} onBack={() => setSelectedTool(null)} />
      
      case 'report-schedules':
        return <ReportsPanel onBack={() => setSelectedTool(null)} />
      
      case 'cache-management':
        return <CacheManagementPanel onBack={() => setSelectedTool(null)} />
      
      case 'provinces':
        return <ProvincesPanel onBack={() => setSelectedTool(null)} />

      case 'bulk-upload':
        return <BulkUploadPanel onBack={() => setSelectedTool(null)} />
      
      case 'development-stages':
      case 'focus-areas':
      case 'form-status':
      case 'funding-status':
      case 'media-source-types':
        const config = crudConfigs[selectedTool]
        const toolOption = toolOptions.find(t => t.id === selectedTool)
        return (
          <CrudPanel
            title={config.title}
            description={config.description}
            icon={toolOption?.icon || Layers}
            apiEndpoint={config.apiEndpoint}
            fields={config.fields}
            displayField={config.displayField}
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
    bulk: { label: 'Bulk Data Actions', tools: toolOptions.filter(t => t.category === 'bulk') },
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
              const card = (
                <Card
                  key={tool.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
                    "group h-full"
                  )}
                  onClick={tool.href ? undefined : () => setSelectedTool(tool.id)}
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
              return tool.href ? <Link key={tool.id} href={tool.href}>{card}</Link> : card
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
