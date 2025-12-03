"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { CalendarIcon, PlusIcon, Lock } from "lucide-react"
import { format } from "date-fns"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Funder, Fund } from "@prisma/client"
import { Decimal } from "@prisma/client/runtime/library"
import { DocumentFull } from "@/types/models"

interface EditingFund {
  id: number
  name: string
  fundAmount?: Decimal | number
  fundingStart: Date | string
  fundingEnd: Date | string
  notes?: string
}

interface LinkFunderDialogProps {
  // Either fund or funder will be locked
  fundId?: number
  fundName?: string
  funderId?: number
  funderName?: string
  // Lists for selection
  availableFunders?: Funder[]
  availableFunds?: Fund[]
  // Edit mode
  editMode?: boolean
  editingFund?: EditingFund | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  callback?: () => void
}

export function LinkFunderDialog({ fundId, fundName, funderId, funderName, availableFunders, availableFunds, editMode = false, editingFund, open: controlledOpen, onOpenChange, callback }: LinkFunderDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedFunder, setSelectedFunder] = useState<string>(editMode && editingFund ? String(funderId) : "")
  const [selectedFund, setSelectedFund] = useState<string>(editMode && editingFund ? String(editingFund.id) : "")
  const [amount, setAmount] = useState<string>(editMode && editingFund?.fundAmount ? String(editingFund.fundAmount) : "")
  const [startDate, setStartDate] = useState<Date | undefined>(editMode && editingFund?.fundingStart ? new Date(editingFund.fundingStart) : undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(editMode && editingFund?.fundingEnd ? new Date(editingFund.fundingEnd) : undefined)
  const [notes, setNotes] = useState<string>(editMode && editingFund?.notes ? editingFund.notes : "")
  const [documents, setDocuments] = useState<File[]>([])
  const [existingDocuments, setExistingDocuments] = useState<DocumentFull[]>([])
  const [loadingDocuments, setLoadingDocuments] = useState(false)
  
  // Use controlled or internal open state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen
  
  // Determine which field is locked
  const isFundLocked = !!fundId && !!fundName
  const isFunderLocked = !!funderId && !!funderName

  // Fetch existing documents when in edit mode
  useEffect(() => {
    const fetchDocuments = async () => {
      if (!editMode || !funderId || !editingFund?.id) {
        setExistingDocuments([])
        return
      }
      
      setLoadingDocuments(true)
      try {
        const response = await fetch(`/api/document?fundId=${editingFund.id}&funderId=${funderId}`, {
          cache: 'no-store'
        })
        if (response.ok) {
          const docs: DocumentFull[] = await response.json()
          // Filter to only show documents that have BOTH fundId and funderId
          const linkedDocs = docs.filter((doc) => doc.fundId && doc.funderId)
          setExistingDocuments(linkedDocs)
        }
      } catch (error) {
        console.error("Error fetching documents:", error)
      } finally {
        setLoadingDocuments(false)
      }
    }

    fetchDocuments()
  }, [editMode, funderId, editingFund?.id])

  // Update form when editingFund changes
  useEffect(() => {
    if (editMode && editingFund) {
      setSelectedFunder(String(funderId))
      setSelectedFund(String(editingFund.id))
      setAmount(editingFund.fundAmount ? String(editingFund.fundAmount) : "")
      setStartDate(new Date(editingFund.fundingStart))
      setEndDate(new Date(editingFund.fundingEnd))
      setNotes(editingFund.notes || "")
    } else if (!editMode) {
      // Reset form when not editing
      setSelectedFunder("")
      setSelectedFund("")
      setAmount("")
      setStartDate(undefined)
      setEndDate(undefined)
      setNotes("")
      setDocuments([])
      setExistingDocuments([])
    }
  }, [editMode, editingFund, funderId])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setDocuments(prev => [...prev, ...Array.from(e.target.files!)])
    }
  }

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index))
  }

  const removeAllFiles = () => {
    setDocuments([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const finalFunderId = isFunderLocked ? funderId : parseInt(selectedFunder)
    const finalFundId = isFundLocked ? fundId : parseInt(selectedFund)
    
    if (!finalFunderId || !finalFundId || !amount || !startDate || !endDate) {
      toast.error("Please fill in all required fields")
      return
    }

    setLoading(true)

    try {
      // Use FormData for both POST and PUT to support file uploads
      const formData = new FormData()
      formData.append("fundId", String(finalFundId))
      formData.append("funderId", String(finalFunderId))
      formData.append("amount", amount)
      formData.append("fundingStart", startDate.toISOString())
      formData.append("fundingEnd", endDate.toISOString())
      formData.append("notes", notes || "")

      // Add documents to FormData
      documents.forEach((doc, index) => {
        formData.append(`document_${index}`, doc)
      })

      const response = await fetch(`/api/fund-funder`, {
        method: editMode ? "PUT" : "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(editMode ? "Failed to update contribution" : "Failed to link funder")
      }

      const documentsUploaded = documents.length
      
      toast.success(
        editMode 
          ? `Contribution updated successfully${documentsUploaded > 0 ? ` with ${documentsUploaded} new document(s)` : ""}` 
          : `${isFundLocked ? "Funder" : "Fund"} linked successfully${documentsUploaded > 0 ? ` with ${documentsUploaded} document(s)` : ""}`
      )
      setOpen(false)
      
      // Reset form
      setSelectedFunder("")
      setSelectedFund("")
      setAmount("")
      setStartDate(undefined)
      setEndDate(undefined)
      setNotes("")
      setDocuments([])
      
      if (callback) {
        callback()
      }
    } catch (error) {
      console.error(editMode ? "Error updating contribution:" : "Error linking funder:", error)
      toast.error(editMode ? "Failed to update contribution" : "Failed to link funder")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!editMode && (
        <DialogTrigger asChild>
          <Button size="sm" className="h-9">
            <PlusIcon className="h-4 w-4 mr-1" />
            {isFundLocked ? "Link funder" : "Link fund"}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] max-w-2xl w-full p-0 gap-0 flex flex-col">
        <DialogHeader className="p-5 border-b">
          <DialogTitle>{editMode ? "Edit contribution" : "Link funder to fund"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex-grow contents">
          <div className="flex-grow overflow-y-auto">
            <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: 'calc(90vh - 220px)' }}>
              <div className="space-y-4 mt-4">
              {/* Funder Selection or Locked */}
              <div className="space-y-2">
                <Label htmlFor="funder">Funder</Label>
                {isFunderLocked ? (
                  <div className="relative">
                    <Input
                      id="funder"
                      value={funderName}
                      disabled
                      className="bg-muted pr-10"
                    />
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                ) : (
                  <Select value={selectedFunder} onValueChange={setSelectedFunder}>
                    <SelectTrigger id="funder">
                      <SelectValue placeholder="Select a funder" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFunders?.map((funder) => (
                        <SelectItem key={funder.id} value={String(funder.id)}>
                          {funder.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Fund Selection or Locked */}
              <div className="space-y-2">
                <Label htmlFor="fund">Fund</Label>
                {isFundLocked ? (
                  <div className="relative">
                    <Input
                      id="fund"
                      value={fundName}
                      disabled
                      className="bg-muted pr-10"
                    />
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                ) : (
                  <Select value={selectedFund} onValueChange={setSelectedFund}>
                    <SelectTrigger id="fund">
                      <SelectValue placeholder="Select a fund" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFunds?.map((fund) => (
                        <SelectItem key={fund.id} value={String(fund.id)}>
                          {fund.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-2">
              <Label htmlFor="amount">Amount contributed</Label>
              <Input
                id="amount"
                type="number"
                placeholder="R 120,000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              </div>

              {/* Date Range */}
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <Label>Funding start date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full pl-3 text-left font-normal"
                        type="button"
                      >
                        {startDate ? format(startDate, "d MMM, yyyy") : "Pick a date"}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex-1 space-y-2">
                  <Label>Funding end date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full pl-3 text-left font-normal"
                        type="button"
                      >
                        {endDate ? format(endDate, "d MMM, yyyy") : "Pick a date"}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Contract Documents */}
              <div className="space-y-3">
              <Label htmlFor="documents">Contract documents</Label>
              
              {documents.length > 0 && (
                <div className="space-y-2">
                  {documents.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between py-3 px-4 border rounded-md bg-white">
                      <span className="text-sm text-gray-900">{doc.name}</span>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() => removeDocument(index)}
                        className="text-gray-600 hover:text-gray-900 h-auto p-0 underline"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                {documents.length > 0 ? (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={removeAllFiles}
                    className="text-gray-600 hover:text-gray-900 h-auto p-0 underline"
                  >
                    Remove all files
                  </Button>
                ) : <div />}
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  className="bg-gray-900 hover:bg-gray-800 text-white"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Upload file
                </Button>
              </div>

              {/* Existing Documents (Edit Mode) */}
              {editMode && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium">Existing documents</Label>
                    {loadingDocuments && (
                      <span className="text-xs text-gray-500">Loading...</span>
                    )}
                  </div>
                  
                  {existingDocuments.length > 0 ? (
                    <div className="space-y-2">
                      {existingDocuments.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between py-3 px-4 border rounded-md bg-gray-50">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                            {doc.description && (
                              <p className="text-xs text-gray-500 mt-1">{doc.description}</p>
                            )}
                          </div>
                          <a
                            href={doc.filePath}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 underline ml-4"
                          >
                            View
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    !loadingDocuments && (
                      <p className="text-sm text-gray-500 italic">No existing documents found</p>
                    )
                  )}
                </div>
              )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Enter any specific notes around this funding..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
              </div>
            </div>
            </div>
          </div>
          <DialogFooter className="flex sm:justify-between flex-col sm:flex-row gap-2 px-4 pb-4 pt-2 border-t mt-auto">
            <Button type="button" onClick={() => setOpen(false)} variant="secondary" className="sm:order-1 order-2">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="sm:order-2 order-1">
              {loading ? (editMode ? "Updating..." : "Linking...") : (editMode ? "Update contribution" : (isFundLocked ? "Link funder" : "Link fund"))}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
