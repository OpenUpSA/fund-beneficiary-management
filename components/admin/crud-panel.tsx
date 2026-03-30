"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ArrowLeft, Edit, Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

export interface FieldConfig {
  name: string
  label: string
  type: 'text' | 'textarea' | 'number'
  required?: boolean
  placeholder?: string
}

export interface CrudPanelProps {
  title: string
  description: string
  icon: React.ElementType
  apiEndpoint: string
  fields: FieldConfig[]
  onBack: () => void
  idField?: string
  displayField?: string
}

interface Item {
  id: number
  [key: string]: unknown
}

export function CrudPanel({
  title,
  description,
  icon: Icon,
  apiEndpoint,
  fields,
  onBack,
  idField = 'id',
  displayField = 'label',
}: CrudPanelProps) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [deletingItem, setDeletingItem] = useState<Item | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})

  // Refetch items after mutations
  const refetchItems = async () => {
    try {
      const response = await fetch(apiEndpoint)
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      setItems(data)
    } catch (error) {
      console.error('Error fetching items:', error)
      toast.error('Failed to load items')
    }
  }

  useEffect(() => {
    const loadItems = async () => {
      try {
        const response = await fetch(apiEndpoint)
        if (!response.ok) throw new Error('Failed to fetch')
        const data = await response.json()
        setItems(data)
      } catch (error) {
        console.error('Error fetching items:', error)
        toast.error('Failed to load items')
      } finally {
        setLoading(false)
      }
    }
    loadItems()
  }, [apiEndpoint])

  // Initialize form data
  const initFormData = (item?: Item) => {
    const data: Record<string, string> = {}
    fields.forEach(field => {
      data[field.name] = item ? String(item[field.name] || '') : ''
    })
    setFormData(data)
  }

  // Handle create/edit
  const handleOpenDialog = (item?: Item) => {
    setEditingItem(item || null)
    initFormData(item)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const method = editingItem ? 'PUT' : 'POST'
      const url = editingItem ? `${apiEndpoint}/${editingItem[idField]}` : apiEndpoint
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save')
      }

      toast.success(editingItem ? 'Updated successfully' : 'Created successfully')
      setDialogOpen(false)
      refetchItems()
    } catch (error) {
      console.error('Error saving:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // Handle delete
  const handleDelete = async () => {
    if (!deletingItem) return
    
    setSaving(true)
    try {
      const response = await fetch(`${apiEndpoint}/${deletingItem[idField]}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete')
      }

      toast.success('Deleted successfully')
      setDeleteDialogOpen(false)
      setDeletingItem(null)
      refetchItems()
    } catch (error) {
      console.error('Error deleting:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete')
    } finally {
      setSaving(false)
    }
  }

  const renderFieldInput = (field: FieldConfig) => {
    const value = formData[field.name] || ''
    const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData(prev => ({ ...prev, [field.name]: e.target.value }))
    }

    if (field.type === 'textarea') {
      return (
        <Textarea
          id={field.name}
          value={value}
          onChange={onChange}
          placeholder={field.placeholder}
          required={field.required}
        />
      )
    }

    return (
      <Input
        id={field.name}
        type={field.type === 'number' ? 'number' : 'text'}
        value={value}
        onChange={onChange}
        placeholder={field.placeholder}
        required={field.required}
      />
    )
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Admin Tools
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Icon className="h-5 w-5" />
                {title}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Add New
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No items found. Click &ldquo;Add New&rdquo; to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  {fields.map(field => (
                    <TableHead key={field.name}>{field.label}</TableHead>
                  ))}
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item[idField] as number}>
                    <TableCell className="font-mono text-sm">{item[idField] as number}</TableCell>
                    {fields.map(field => (
                      <TableCell key={field.name}>
                        {field.type === 'textarea' 
                          ? String(item[field.name] || '').substring(0, 50) + (String(item[field.name] || '').length > 50 ? '...' : '')
                          : String(item[field.name] || '')}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeletingItem(item)
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit' : 'Create'} {title}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update the details below.' : 'Fill in the details to create a new item.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {fields.map(field => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {renderFieldInput(field)}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{deletingItem?.[displayField] as string}&rdquo;. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={saving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
