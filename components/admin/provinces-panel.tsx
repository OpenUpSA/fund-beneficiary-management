"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { ArrowLeft, Edit, Loader2, MapPin, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"

interface ProvincesPanelProps {
  onBack: () => void
}

interface District {
  name: string
  code?: string
}

interface Province {
  id: number
  name: string
  code: string
  districts: District[]
}

export function ProvincesPanel({ onBack }: ProvincesPanelProps) {
  const [provinces, setProvinces] = useState<Province[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingProvince, setEditingProvince] = useState<Province | null>(null)
  const [deletingProvince, setDeletingProvince] = useState<Province | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    districts: [] as District[]
  })
  const [newDistrictName, setNewDistrictName] = useState('')

  const fetchProvinces = async () => {
    try {
      const response = await fetch('/api/provinces')
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      // Parse districts if they're stored as JSON strings
      const parsed = data.map((p: Province) => ({
        ...p,
        districts: Array.isArray(p.districts) ? p.districts : []
      }))
      setProvinces(parsed)
    } catch (error) {
      console.error('Error fetching provinces:', error)
      toast.error('Failed to load provinces')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProvinces()
  }, [])

  const handleOpenDialog = (province?: Province) => {
    if (province) {
      setEditingProvince(province)
      setFormData({
        name: province.name,
        code: province.code,
        districts: Array.isArray(province.districts) ? province.districts : []
      })
    } else {
      setEditingProvince(null)
      setFormData({ name: '', code: '', districts: [] })
    }
    setNewDistrictName('')
    setDialogOpen(true)
  }

  const handleAddDistrict = () => {
    if (!newDistrictName.trim()) return
    setFormData(prev => ({
      ...prev,
      districts: [...prev.districts, { name: newDistrictName.trim() }]
    }))
    setNewDistrictName('')
  }

  const handleRemoveDistrict = (index: number) => {
    setFormData(prev => ({
      ...prev,
      districts: prev.districts.filter((_, i) => i !== index)
    }))
  }

  const handleSave = async () => {
    if (!formData.name || !formData.code) {
      toast.error('Name and code are required')
      return
    }

    setSaving(true)
    try {
      const method = editingProvince ? 'PUT' : 'POST'
      const url = editingProvince 
        ? `/api/provinces/${editingProvince.id}` 
        : '/api/provinces'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save')
      }

      toast.success(editingProvince ? 'Province updated' : 'Province created')
      setDialogOpen(false)
      fetchProvinces()
    } catch (error) {
      console.error('Error saving province:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingProvince) return

    setSaving(true)
    try {
      const response = await fetch(`/api/provinces/${deletingProvince.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete')
      }

      toast.success('Province deleted')
      setDeleteDialogOpen(false)
      setDeletingProvince(null)
      fetchProvinces()
    } catch (error) {
      console.error('Error deleting province:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete')
    } finally {
      setSaving(false)
    }
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
                <MapPin className="h-5 w-5" />
                Provinces & Districts
              </CardTitle>
              <CardDescription>
                Manage provinces and their districts
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Province
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : provinces.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No provinces found. Click &ldquo;Add Province&rdquo; to create one.
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {provinces.map((province) => (
                <AccordionItem key={province.id} value={String(province.id)}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-4 flex-1">
                      <span className="font-medium">{province.name}</span>
                      <Badge variant="outline" className="font-mono">{province.code}</Badge>
                      <Badge variant="secondary" className="ml-auto mr-4">
                        {province.districts?.length || 0} districts
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pl-4 space-y-4">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(province)}
                          className="gap-1"
                        >
                          <Edit className="h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDeletingProvince(province)
                            setDeleteDialogOpen(true)
                          }}
                          className="gap-1 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                      
                      {province.districts && province.districts.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {province.districts.map((district, index) => (
                            <div 
                              key={index} 
                              className="px-3 py-2 bg-muted rounded-md text-sm"
                            >
                              {district.name}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No districts defined</p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProvince ? 'Edit' : 'Create'} Province</DialogTitle>
            <DialogDescription>
              {editingProvince ? 'Update province details and districts.' : 'Add a new province with its districts.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Province Name <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Western Cape"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Province Code <span className="text-destructive">*</span></Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g., WC"
                  maxLength={5}
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label>Districts ({formData.districts.length})</Label>
              
              <div className="flex gap-2">
                <Input
                  value={newDistrictName}
                  onChange={(e) => setNewDistrictName(e.target.value)}
                  placeholder="Enter district name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddDistrict()
                    }
                  }}
                />
                <Button type="button" onClick={handleAddDistrict} variant="secondary">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {formData.districts.length > 0 && (
                <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                  <div className="flex flex-wrap gap-2">
                    {formData.districts.map((district, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary"
                        className="gap-1 pr-1"
                      >
                        {district.name}
                        <button
                          type="button"
                          onClick={() => handleRemoveDistrict(index)}
                          className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
            <AlertDialogTitle>Delete Province</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deletingProvince?.name}&rdquo;? 
              This will also remove all {deletingProvince?.districts?.length || 0} districts.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
