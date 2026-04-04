"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { ArrowLeft, Database, Loader2, RefreshCw, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface CacheManagementPanelProps {
  onBack: () => void
}

interface CacheTag {
  tag: string
  description: string
  category: string
}

const cacheTags: CacheTag[] = [
  { tag: 'ldas:list', description: 'List of all LDAs', category: 'LDAs' },
  { tag: 'funders:list', description: 'List of all funders', category: 'Funders' },
  { tag: 'funds:list', description: 'List of all funds', category: 'Funds' },
  { tag: 'templates', description: 'Form templates', category: 'Templates' },
  { tag: 'users:list', description: 'List of all users', category: 'Users' },
  { tag: 'media:list', description: 'Media library', category: 'Media' },
  { tag: 'documents:list', description: 'Documents library', category: 'Documents' },
  { tag: 'funding-statuses', description: 'Funding status lookup values', category: 'Reference Data' },
  { tag: 'development-stages', description: 'Development stage lookup values', category: 'Reference Data' },
  { tag: 'locations', description: 'Location lookup values', category: 'Reference Data' },
  { tag: 'focus-areas', description: 'Focus area lookup values', category: 'Reference Data' },
  { tag: 'form-statuses', description: 'Form status lookup values', category: 'Reference Data' },
  { tag: 'provinces:list', description: 'Province lookup values', category: 'Reference Data' },
  { tag: 'media-source-types:list', description: 'Media source type lookup values', category: 'Reference Data' },
]

export function CacheManagementPanel({ onBack }: CacheManagementPanelProps) {
  const [flushing, setFlushing] = useState<string | null>(null)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [flushAllDialogOpen, setFlushAllDialogOpen] = useState(false)

  const handleFlushTag = async (tag: string) => {
    setFlushing(tag)
    try {
      const response = await fetch('/api/admin/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revalidate', tag })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to flush cache')
      }

      toast.success(`Cache "${tag}" flushed successfully`)
    } catch (error) {
      console.error('Error flushing cache:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to flush cache')
    } finally {
      setFlushing(null)
      setConfirmDialogOpen(false)
      setSelectedTag(null)
    }
  }

  const handleFlushAll = async () => {
    setFlushing('all')
    try {
      const response = await fetch('/api/admin/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revalidate-all' })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to flush all caches')
      }

      toast.success('All caches flushed successfully')
    } catch (error) {
      console.error('Error flushing all caches:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to flush all caches')
    } finally {
      setFlushing(null)
      setFlushAllDialogOpen(false)
    }
  }

  const openConfirmDialog = (tag: string) => {
    setSelectedTag(tag)
    setConfirmDialogOpen(true)
  }

  // Group tags by category
  const groupedTags = cacheTags.reduce((acc, tag) => {
    if (!acc[tag.category]) acc[tag.category] = []
    acc[tag.category].push(tag)
    return acc
  }, {} as Record<string, CacheTag[]>)

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
                <Database className="h-5 w-5" />
                Cache Management
              </CardTitle>
              <CardDescription>
                Manage and flush API caches. Use this when data appears stale or after bulk updates.
              </CardDescription>
            </div>
            <Button 
              variant="destructive" 
              onClick={() => setFlushAllDialogOpen(true)}
              disabled={flushing !== null}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Flush All Caches
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Cache Tag</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-32 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(groupedTags).map(([category, tags]) => (
                tags.map((tag, index) => (
                  <TableRow key={tag.tag}>
                    {index === 0 && (
                      <TableCell rowSpan={tags.length} className="font-medium align-top">
                        <Badge variant="outline">{category}</Badge>
                      </TableCell>
                    )}
                    <TableCell className="font-mono text-sm">{tag.tag}</TableCell>
                    <TableCell className="text-muted-foreground">{tag.description}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openConfirmDialog(tag.tag)}
                        disabled={flushing !== null}
                        className="gap-1"
                      >
                        {flushing === tag.tag ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                        Flush
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ))}
            </TableBody>
          </Table>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">About Caching</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Caches are automatically invalidated when data is modified through the API</li>
              <li>• Use manual flush when data appears stale or after direct database changes</li>
              <li>• Flushing a cache will cause the next request to fetch fresh data from the database</li>
              <li>• Flush All should be used sparingly as it may temporarily slow down the application</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Confirm Single Flush Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Flush Cache</AlertDialogTitle>
            <AlertDialogDescription>
              This will invalidate the &ldquo;{selectedTag}&rdquo; cache. The next request will fetch fresh data from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={flushing !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedTag && handleFlushTag(selectedTag)}
              disabled={flushing !== null}
            >
              {flushing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Flush Cache
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Flush All Dialog */}
      <AlertDialog open={flushAllDialogOpen} onOpenChange={setFlushAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Flush All Caches</AlertDialogTitle>
            <AlertDialogDescription>
              This will invalidate ALL caches. This may temporarily slow down the application as all data will need to be refetched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={flushing !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleFlushAll}
              disabled={flushing !== null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {flushing === 'all' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Flush All Caches
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
