"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Field } from "@/types/forms"
import { Plus, X, Check, Loader2, Info, ChevronsUpDown, RotateCcw } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

interface GardenYieldsLayoutProps {
  inputField: Field
  isEditing: boolean
  onValueChange?: (field: Field, value: string) => void
  lda_id?: number
  lda_form_id?: number | string
}

interface Garden {
  id: string
  name: string
  isComplete: boolean
  fields: Record<string, string>
}

interface Column {
  name: string
  label: string
  type?: 'text' | 'number' | 'select'
  tooltip?: string
}

interface FarmedItem {
  name: string
  reason?: string // Reason for removal (only for removed items)
  [key: string]: string | undefined
}

interface GardenYieldsData {
  existing: FarmedItem[]
  added: FarmedItem[]
  removed: FarmedItem[]
  noYield?: boolean // Toggle: garden did not yield anything this term
  noYieldReason?: string // Required reason if noYield is true
}

// Default farmed item options
const DEFAULT_FARMED_ITEMS = [
  "Carrots", "Lettuces", "Potatoes", "Maize", "Wildflowers", 
  "Honey (Beehives)", "Tomato", "Spinach", "Cabbage", "Onions",
  "Beans", "Peas", "Peppers", "Squash", "Herbs"
]

// Searchable Select component with custom input fallback
interface SearchableSelectProps {
  value: string
  options: string[]
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
}

function SearchableSelect({ value, options, onChange, disabled, placeholder }: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value || '')

  // Filter options based on input
  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(inputValue.toLowerCase())
  )

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue)
    setInputValue(selectedValue)
    setOpen(false)
  }

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue)
    onChange(newValue)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full h-9 justify-between font-normal"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || placeholder || "Select..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search or type..." 
            value={inputValue}
            onValueChange={handleInputChange}
          />
          <CommandList>
            {filteredOptions.length === 0 && inputValue && (
              <CommandItem
                onSelect={() => handleSelect(inputValue)}
                className="cursor-pointer"
              >
                Use &quot;{inputValue}&quot;
              </CommandItem>
            )}
            {filteredOptions.length === 0 && !inputValue && (
              <CommandEmpty>No items found.</CommandEmpty>
            )}
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => handleSelect(option)}
                  className="cursor-pointer"
                >
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function GardenYieldsLayout({ 
  inputField, 
  isEditing, 
  onValueChange,
  lda_form_id,
}: GardenYieldsLayoutProps) {
  const [gardenYields, setGardenYields] = useState<Record<string, GardenYieldsData>>({})
  const [editingRows, setEditingRows] = useState<Record<string, boolean>>({})
  const [gardens, setGardens] = useState<Garden[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const initializedRef = useRef(false)
  
  // Removal dialog state
  const [removalDialog, setRemovalDialog] = useState<{
    open: boolean
    gardenId: string
    itemIndex: number
    itemName: string
    reason: string
  }>({ open: false, gardenId: '', itemIndex: -1, itemName: '', reason: '' })

  // Get config from JSON - memoize arrays to prevent dependency issues
  const sourceField = (inputField.config?.sourceField as string) || 'community_gardens'
  const gardenNameField = (inputField.config?.gardenNameField as string) || 'garden_name'
  const requiredFields: string[] = useMemo(() => 
    (inputField.config?.requiredFields as unknown as string[]) || [
      'garden_name', 'garden_size', 'garden_address', 'contact_person', 'contact_number', 'external_support'
    ],
    [inputField.config?.requiredFields]
  )
  const columns: Column[] = useMemo(() => 
    (inputField.config?.columns as unknown as Column[]) || [
      { name: 'units_planted', label: 'Units planted', type: 'number', tooltip: 'Number of units planted' },
      { name: 'harvested_kg', label: 'Harvested (kg)', type: 'number', tooltip: 'Weight harvested in kg' },
      { name: 'sold_kg', label: 'Sold (kg)', type: 'number', tooltip: 'Weight sold in kg' }
    ],
    [inputField.config?.columns]
  )
  const farmedItemOptions: string[] = (inputField.config?.farmedItemOptions as unknown as string[]) || DEFAULT_FARMED_ITEMS
  const addButtonLabel = (inputField.config?.addButtonLabel as string) || 'Add farmed item'
  
  // Helper to get empty yields data structure
  const getEmptyYieldsData = (): GardenYieldsData => ({
    existing: [],
    added: [],
    removed: []
  })

  // Fetch gardens from API
  const fetchGardens = useCallback(async () => {
    if (!lda_form_id) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        sourceField,
        nameField: gardenNameField,
        requiredFields: requiredFields.join(',')
      })
      
      const response = await fetch(`/api/lda-form/${lda_form_id}/linked-data?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch garden data')
      }
      
      const data = await response.json()
      // Convert id to string for consistency
      const gardensWithStringId = (data.gardens || []).map((g: { id: number; name: string; isComplete: boolean; fields: Record<string, string> }) => ({
        ...g,
        id: String(g.id)
      }))
      setGardens(gardensWithStringId)
      
      // Clean up orphaned fields if any
      if (data.orphanedFields && data.orphanedFields.length > 0) {
        await fetch(`/api/lda-form/${lda_form_id}/linked-data`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fieldsToDelete: data.orphanedFields })
        })
      }
    } catch (err) {
      console.error('Error fetching gardens:', err)
      setError('Failed to load garden data')
    } finally {
      setIsLoading(false)
    }
  }, [lda_form_id, sourceField, gardenNameField, requiredFields])

  // Fetch gardens on mount
  useEffect(() => {
    fetchGardens()
  }, [fetchGardens])

  // Initialize yields from saved data
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    
    const yieldsData: Record<string, GardenYieldsData> = {}
    
    inputField.fields?.forEach(field => {
      // Look for yield data fields: garden_yields_1, garden_yields_2, etc.
      const match = field.name.match(new RegExp(`^${inputField.name}_(\\d+)$`))
      if (match && field.value) {
        try {
          const parsed = JSON.parse(field.value)
          // Handle both old format (array) and new format (object with existing/added/removed)
          if (Array.isArray(parsed)) {
            // Old format - treat all as existing
            yieldsData[match[1]] = {
              existing: parsed,
              added: [],
              removed: []
            }
          } else if (parsed.existing || parsed.added || parsed.removed || parsed.noYield !== undefined) {
            // New format
            yieldsData[match[1]] = {
              existing: parsed.existing || [],
              added: parsed.added || [],
              removed: parsed.removed || [],
              noYield: parsed.noYield || false,
              noYieldReason: parsed.noYieldReason || ''
            }
          } else {
            yieldsData[match[1]] = getEmptyYieldsData()
          }
        } catch {
          yieldsData[match[1]] = getEmptyYieldsData()
        }
      }
    })
    
    setGardenYields(yieldsData)
  }, [inputField.fields, inputField.name])

  // Save yields for a garden
  const saveYields = useCallback((gardenId: string, data: GardenYieldsData) => {
    const fieldKey = `${inputField.name}_${gardenId}`
    const jsonValue = JSON.stringify(data)
    
    if (onValueChange) {
      const existingField = inputField.fields?.find(f => f.name === fieldKey)
      const field = existingField || {
        name: fieldKey,
        type: 'text',
        label: '',
        value: jsonValue,
        show: true
      }
      onValueChange(field, jsonValue)
    }
  }, [inputField.name, inputField.fields, onValueChange])


  // Get all item names currently in use (existing + added) for a garden
  const getUsedItemNames = useCallback((gardenId: string): string[] => {
    const data = gardenYields[gardenId] || getEmptyYieldsData()
    return [
      ...data.existing.map(item => item.name),
      ...data.added.map(item => item.name)
    ].filter(Boolean) as string[]
  }, [gardenYields])

  // Add new farmed item to "added" list
  const addFarmedItem = useCallback((gardenId: string) => {
    const newItem: FarmedItem = { name: '' }
    columns.forEach(col => {
      newItem[col.name] = ''
    })
    
    setGardenYields(prev => {
      const current = prev[gardenId] || getEmptyYieldsData()
      const updated: GardenYieldsData = {
        ...current,
        added: [...current.added, newItem]
      }
      // Mark the new row as editing
      const rowKey = `${gardenId}_added_${updated.added.length - 1}`
      setEditingRows(prevRows => ({ ...prevRows, [rowKey]: true }))
      return { ...prev, [gardenId]: updated }
    })
  }, [columns])

  // Remove item from "added" list (no confirmation needed)
  const removeAddedItem = useCallback((gardenId: string, index: number) => {
    setGardenYields(prev => {
      const current = prev[gardenId] || getEmptyYieldsData()
      const updated: GardenYieldsData = {
        ...current,
        added: current.added.filter((_: FarmedItem, i: number) => i !== index)
      }
      saveYields(gardenId, updated)
      return { ...prev, [gardenId]: updated }
    })
  }, [saveYields])

  // Open removal dialog for existing item
  const openRemovalDialog = useCallback((gardenId: string, index: number, itemName: string) => {
    setRemovalDialog({
      open: true,
      gardenId,
      itemIndex: index,
      itemName,
      reason: ''
    })
  }, [])

  // Confirm removal of existing item (moves to removed list)
  const confirmRemoveExistingItem = useCallback(() => {
    const { gardenId, itemIndex, reason } = removalDialog
    
    setGardenYields(prev => {
      const current = prev[gardenId] || getEmptyYieldsData()
      const itemToRemove = { ...current.existing[itemIndex], reason }
      const updated: GardenYieldsData = {
        existing: current.existing.filter((_: FarmedItem, i: number) => i !== itemIndex),
        added: current.added,
        removed: [...current.removed, itemToRemove]
      }
      saveYields(gardenId, updated)
      return { ...prev, [gardenId]: updated }
    })
    
    setRemovalDialog({ open: false, gardenId: '', itemIndex: -1, itemName: '', reason: '' })
  }, [removalDialog, saveYields])

  // Restore item from removed back to existing
  const restoreRemovedItem = useCallback((gardenId: string, index: number) => {
    setGardenYields(prev => {
      const current = prev[gardenId] || getEmptyYieldsData()
      const itemToRestore = { ...current.removed[index] }
      delete itemToRestore.reason // Remove the reason field
      const updated: GardenYieldsData = {
        existing: [...current.existing, itemToRestore],
        added: current.added,
        removed: current.removed.filter((_: FarmedItem, i: number) => i !== index)
      }
      saveYields(gardenId, updated)
      return { ...prev, [gardenId]: updated }
    })
  }, [saveYields])

  // Update item in existing list
  const updateExistingItem = useCallback((gardenId: string, index: number, field: string, value: string) => {
    setGardenYields(prev => {
      const current = prev[gardenId] || getEmptyYieldsData()
      const updatedExisting = [...current.existing]
      updatedExisting[index] = { ...updatedExisting[index], [field]: value }
      const updated: GardenYieldsData = { ...current, existing: updatedExisting }
      return { ...prev, [gardenId]: updated }
    })
  }, [])

  // Update item in added list
  const updateAddedItem = useCallback((gardenId: string, index: number, field: string, value: string) => {
    setGardenYields(prev => {
      const current = prev[gardenId] || getEmptyYieldsData()
      const updatedAdded = [...current.added]
      updatedAdded[index] = { ...updatedAdded[index], [field]: value }
      const updated: GardenYieldsData = { ...current, added: updatedAdded }
      return { ...prev, [gardenId]: updated }
    })
  }, [])

  // Confirm/save an added row
  const confirmAddedRow = useCallback((gardenId: string, index: number) => {
    const rowKey = `${gardenId}_added_${index}`
    setEditingRows(prev => ({ ...prev, [rowKey]: false }))
    setGardenYields(prev => {
      const current = prev[gardenId] || getEmptyYieldsData()
      saveYields(gardenId, current)
      return prev
    })
  }, [saveYields])

  // Save existing items on blur
  const saveExistingOnBlur = useCallback((gardenId: string) => {
    const current = gardenYields[gardenId] || getEmptyYieldsData()
    saveYields(gardenId, current)
  }, [gardenYields, saveYields])

  // Get item count for badge - count existing + confirmed added items
  const getItemCount = useCallback((gardenId: string) => {
    const data = gardenYields[gardenId] || getEmptyYieldsData()
    const confirmedAdded = data.added.filter((_: FarmedItem, idx: number) => !editingRows[`${gardenId}_added_${idx}`])
    return data.existing.length + confirmedAdded.length
  }, [gardenYields, editingRows])

  // Check if a row has all required fields filled
  const isRowComplete = useCallback((item: FarmedItem) => {
    // Name must be filled
    if (!item.name || item.name.trim() === '') return false
    // All columns must have values (allow 0 as valid)
    return columns.every(col => {
      const value = item[col.name]
      return value !== undefined && value !== ''
    })
  }, [columns])

  // Check if garden is incomplete
  const isGardenIncomplete = useCallback((gardenId: string) => {
    const data = gardenYields[gardenId] || getEmptyYieldsData()
    
    // If noYield is checked, check if reason is provided
    if (data.noYield) {
      return !data.noYieldReason || data.noYieldReason.trim() === ''
    }
    
    // If no items at all (and noYield not checked), it's incomplete
    const totalItems = data.existing.length + data.added.filter(
      (_: FarmedItem, idx: number) => !editingRows[`${gardenId}_added_${idx}`]
    ).length
    if (totalItems === 0) {
      return true
    }
    
    // Check existing items for incomplete data
    const hasIncompleteExisting = data.existing.some(item => !isRowComplete(item))
    // Check confirmed added items (not in editing mode)
    const hasIncompleteAdded = data.added.some((item: FarmedItem, idx: number) => 
      !editingRows[`${gardenId}_added_${idx}`] && !isRowComplete(item)
    )
    return hasIncompleteExisting || hasIncompleteAdded
  }, [gardenYields, editingRows, isRowComplete])

  // Calculate overall completion status
  const isComplete = useMemo(() => {
    if (gardens.length === 0) return true // No gardens = nothing to complete, consider complete
    return gardens.every(garden => !isGardenIncomplete(garden.id))
  }, [gardens, isGardenIncomplete])

  // Get status field name from config
  const statusFieldName = (inputField.config?.statusField as string) || null

  // Track previous status to avoid unnecessary saves
  const prevStatusRef = useRef<boolean | null>(null)

  // Save status to the status field whenever completion changes
  useEffect(() => {
    if (statusFieldName && onValueChange && prevStatusRef.current !== isComplete) {
      prevStatusRef.current = isComplete
      const statusField: Field = {
        name: statusFieldName,
        type: 'text',
        label: '',
        show: false
      }
      onValueChange(statusField, isComplete ? 'complete' : 'incomplete')
    }
  }, [isComplete, statusFieldName, onValueChange])

  // Toggle noYield for a garden
  const toggleNoYield = useCallback((gardenId: string, checked: boolean) => {
    const current = gardenYields[gardenId] || getEmptyYieldsData()
    const updated: GardenYieldsData = {
      ...current,
      noYield: checked,
      noYieldReason: checked ? current.noYieldReason : undefined
    }
    setGardenYields(prev => ({ ...prev, [gardenId]: updated }))
    saveYields(gardenId, updated)
  }, [gardenYields, saveYields])

  // Update noYield reason
  const updateNoYieldReason = useCallback((gardenId: string, reason: string) => {
    setGardenYields(prev => {
      const current = prev[gardenId] || getEmptyYieldsData()
      const updated: GardenYieldsData = {
        ...current,
        noYieldReason: reason
      }
      return { ...prev, [gardenId]: updated }
    })
  }, [])

  // Save noYield reason on blur
  const saveNoYieldReason = useCallback((gardenId: string) => {
    setGardenYields(prev => {
      const current = prev[gardenId] || getEmptyYieldsData()
      saveYields(gardenId, current)
      return prev
    })
  }, [saveYields])

  // Early returns after ALL hooks
  if (inputField.show === false) return <></>

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        <span className="ml-2 text-slate-500">Loading garden data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-red-500 p-4 bg-red-50 rounded-lg">
        {error}
        <Button variant="link" onClick={fetchGardens} className="ml-2">
          Retry
        </Button>
      </div>
    )
  }

  if (gardens.length === 0) {
    return (
      <div className="text-sm text-slate-500 italic p-4 bg-slate-50 rounded-lg">
        No completed community gardens found. Please complete garden details in the previous section first.
      </div>
    )
  }

  // Column headers component
  const ColumnHeaders = () => (
    <div 
      className="grid gap-4 mb-3 text-sm text-slate-500"
      style={{ gridTemplateColumns: `minmax(150px, 1.5fr) repeat(${columns.length}, minmax(100px, 1fr)) 40px` }}
    >
      <div>Farmed item</div>
      {columns.map(col => (
        <div key={col.name} className="flex items-center gap-1">
          {col.label}
          {col.tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-sm">{col.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      ))}
      <div></div>
    </div>
  )

  return (
    <>
      {/* Removal Confirmation Dialog */}
      <Dialog open={removalDialog.open} onOpenChange={(open) => !open && setRemovalDialog(prev => ({ ...prev, open: false }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove &quot;{removalDialog.itemName}&quot;?</DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <p>
                If you did not grow this crop during this reporting period but plan to grow it in the future according to season, 
                you can enter <strong>0</strong> for all values instead of removing it.
              </p>
              <p>
                If you will not plant this item again, please provide a reason for removal:
              </p>
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for removal (required if not planting again)"
            value={removalDialog.reason}
            onChange={(e) => setRemovalDialog(prev => ({ ...prev, reason: e.target.value }))}
            className="min-h-[80px] text-slate-700"
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRemovalDialog(prev => ({ ...prev, open: false }))}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmRemoveExistingItem}
              disabled={!removalDialog.reason.trim()}
            >
              Remove Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="p-4 pt-2">
        <h3 className="text-lg pb-4 text-slate-900"><span className="font-semibold">Items planted or harvested</span> for each community garden</h3>
        
        <Accordion type="single" collapsible className="space-y-2">
          {gardens.map((garden) => {
            const data = gardenYields[garden.id] || getEmptyYieldsData()
            const itemCount = getItemCount(garden.id)
            const usedNames = getUsedItemNames(garden.id)
            const availableOptions = farmedItemOptions.filter(opt => !usedNames.includes(opt))
            const isIncomplete = isGardenIncomplete(garden.id)

            return (
              <AccordionItem key={garden.id} value={garden.id} className="border rounded-md bg-white overflow-hidden border-slate-300">
                {/* Garden Header */}
                <AccordionTrigger className="px-4 py-4 hover:bg-slate-50 hover:no-underline transition-colors">
                  <div className="flex items-center justify-between flex-1 mr-3">
                    <div className="flex items-center gap-3">
                      <span className="bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold">
                        {itemCount}
                      </span>
                      <span className="font-semibold text-slate-900">{garden.name}</span>
                    </div>
                    {isIncomplete && (
                      <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded">
                        Incomplete
                      </span>
                    )}
                  </div>
                </AccordionTrigger>

                {/* Garden Content */}
                <AccordionContent className="border-t border-slate-200 p-4 pb-4">
                    {/* No Yield Toggle - only show when there are no items */}
                    {isEditing && data.existing.length === 0 && data.added.length === 0 && (
                      <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={data.noYield || false}
                            onCheckedChange={(checked) => toggleNoYield(garden.id, checked)}
                          />
                          <span className="text-sm text-slate-700">This garden did not yield anything this term</span>
                        </div>
                        {data.noYield && (
                          <div className="mt-3">
                            <Textarea
                              placeholder="Please provide a reason (required)"
                              value={data.noYieldReason || ''}
                              onChange={(e) => updateNoYieldReason(garden.id, e.target.value)}
                              onBlur={() => saveNoYieldReason(garden.id)}
                              className="min-h-[60px] text-sm text-slate-700"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Show no yield reason in view mode */}
                    {!isEditing && data.noYield && (
                      <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                        <p className="text-sm text-slate-600">
                          <span className="font-medium">No yield this term.</span>
                          {data.noYieldReason && <span className="ml-1">Reason: {data.noYieldReason}</span>}
                        </p>
                      </div>
                    )}

                    {/* Show empty state if no items at all and noYield not checked */}
                    {!data.noYield && data.existing.length === 0 && data.added.length === 0 && data.removed.length === 0 && (
                      <div className="text-sm text-slate-500 italic py-5 text-center">
                        No items added yet. {isEditing && <>Click the button below to add farmed items.</>}
                      </div>
                    )}

                    {/* EXISTING ITEMS SECTION */}
                    {data.existing.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-sm font-medium text-slate-700 mb-3">Previous Items</h4>
                        <ColumnHeaders />
                        {data.existing.map((item, itemIdx) => (
                          <div 
                            key={`existing-${itemIdx}`}
                            className="grid gap-4 mb-3 items-center"
                            style={{ gridTemplateColumns: `minmax(150px, 1.5fr) repeat(${columns.length}, minmax(100px, 1fr)) 40px` }}
                          >
                            <div>
                              <span className="text-sm font-medium text-slate-900">{item.name || 'Unnamed'}</span>
                            </div>
                            {columns.map(col => (
                              <div key={col.name}>
                                <Input
                                  type="text"
                                  inputMode={col.type === 'number' ? 'numeric' : 'text'}
                                  pattern={col.type === 'number' ? '[0-9]*' : undefined}
                                  value={item[col.name] || ''}
                                  onChange={(e) => {
                                    const value = col.type === 'number' 
                                      ? e.target.value.replace(/[^0-9]/g, '')
                                      : e.target.value
                                    updateExistingItem(garden.id, itemIdx, col.name, value)
                                  }}
                                  onBlur={() => saveExistingOnBlur(garden.id)}
                                  disabled={!isEditing}
                                  className="h-9 text-slate-700"
                                  placeholder="0"
                                />
                              </div>
                            ))}
                            <div>
                              {isEditing && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openRemovalDialog(garden.id, itemIdx, item.name || 'Unnamed')}
                                  className="h-9 w-9 p-0 text-slate-400 hover:text-red-500"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ADDED ITEMS SECTION */}
                    {(data.added.length > 0 || (data.existing.length === 0 && data.removed.length === 0)) && (
                      <div className="mb-6">
                        {data.existing.length > 0 && <h4 className="text-sm font-medium text-slate-700 mb-3">New Items</h4>}
                        {data.added.length > 0 && (data.existing.length > 0 || data.added.length > 0) && <ColumnHeaders />}
                        {data.added.map((item, itemIdx) => {
                          const rowKey = `${garden.id}_added_${itemIdx}`
                          const isRowEditing = editingRows[rowKey]
                          const rowComplete = isRowComplete(item)
                          
                          return (
                            <div 
                              key={`added-${itemIdx}`}
                              className="grid gap-4 mb-3 items-center"
                              style={{ gridTemplateColumns: `minmax(150px, 1.5fr) repeat(${columns.length}, minmax(100px, 1fr)) 40px` }}
                            >
                              <div>
                                {isRowEditing ? (
                                  <SearchableSelect
                                    value={item.name || ''}
                                    options={availableOptions}
                                    onChange={(value) => updateAddedItem(garden.id, itemIdx, 'name', value)}
                                    disabled={!isEditing}
                                    placeholder="Select or type item"
                                  />
                                ) : (
                                  <span className="text-sm font-medium text-slate-900">{item.name || 'Unnamed'}</span>
                                )}
                              </div>
                              {columns.map(col => (
                                <div key={col.name}>
                                  <Input
                                    type="text"
                                    inputMode={col.type === 'number' ? 'numeric' : 'text'}
                                    pattern={col.type === 'number' ? '[0-9]*' : undefined}
                                    value={item[col.name] || ''}
                                    onChange={(e) => {
                                      const value = col.type === 'number' 
                                        ? e.target.value.replace(/[^0-9]/g, '')
                                        : e.target.value
                                      updateAddedItem(garden.id, itemIdx, col.name, value)
                                    }}
                                    disabled={!isEditing}
                                    className="h-9 text-slate-700"
                                    placeholder="0"
                                  />
                                </div>
                              ))}
                              <div>
                                {isEditing && (
                                  isRowEditing ? (
                                    <Button
                                      type="button"
                                      variant="default"
                                      size="sm"
                                      onClick={() => confirmAddedRow(garden.id, itemIdx)}
                                      disabled={!rowComplete}
                                      className={cn("h-9 w-9 p-0", !rowComplete && "opacity-50 cursor-not-allowed")}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                  ) : (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeAddedItem(garden.id, itemIdx)}
                                      className="h-9 w-9 p-0 text-slate-400 hover:text-red-500"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  )
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Add Button - hidden when noYield is checked */}
                    {isEditing && !data.noYield && (
                      <Button
                        type="button"
                        variant="default"
                        onClick={() => addFarmedItem(garden.id)}
                        className="w-full mt-2 bg-slate-900 hover:bg-slate-800"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {addButtonLabel}
                      </Button>
                    )}

                    {/* REMOVED ITEMS SECTION - Greyed out at bottom */}
                    {data.removed.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-slate-200">
                        <h4 className="text-sm font-medium text-slate-400 mb-3">Removed Items</h4>
                        {data.removed.map((item, itemIdx) => (
                          <div 
                            key={`removed-${itemIdx}`}
                            className="flex items-center justify-between py-2 px-3 mb-2 bg-slate-50 rounded-md text-slate-400"
                          >
                            <div className="flex-1">
                              <span className="text-sm font-medium line-through">{item.name}</span>
                              {item.reason && (
                                <p className="text-xs text-slate-400 mt-1">Reason: {item.reason}</p>
                              )}
                            </div>
                            {isEditing && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => restoreRemovedItem(garden.id, itemIdx)}
                                className="h-8 px-2 text-slate-400 hover:text-slate-600"
                              >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Restore
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </div>
    </>
  )
}
