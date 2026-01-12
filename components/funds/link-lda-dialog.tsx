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
import { Input } from "@/components/ui/input"
import { CalendarIcon, PlusIcon, Lock } from "lucide-react"
import { format } from "date-fns"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { FundedLDAs } from "@/types/models"
import { LDA_TERMINOLOGY } from "@/constants/lda"

interface LDA {
  id: number
  name: string
}

interface LinkLDADialogProps {
  fundId: number
  fundName?: string
  fundDefaultAmount?: number | null
  availableLDAs: LDA[]
  editingLDA?: FundedLDAs | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  callback?: () => void
}

export function LinkLDADialog({ fundId, fundName, fundDefaultAmount, availableLDAs, editingLDA, open: controlledOpen, onOpenChange, callback }: LinkLDADialogProps) {

  const [internalOpen, setInternalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedLDA, setSelectedLDA] = useState<string>(editingLDA ? String(editingLDA.id) : "")
  const [description, setDescription] = useState<string>(editingLDA?.description || "")
  const [startDate, setStartDate] = useState<Date | undefined>(editingLDA?.fundingStart ? new Date(editingLDA.fundingStart) : undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(editingLDA?.fundingEnd ? new Date(editingLDA.fundingEnd) : undefined)
  const [fundingStatus, setFundingStatus] = useState<string>(editingLDA?.fundingStatus || "Active")
  const [amountType, setAmountType] = useState<string>(editingLDA?.amountType || "USE_DEFAULT")
  const [amount, setAmount] = useState<string>(editingLDA?.amount ? String(editingLDA.amount) : (fundDefaultAmount ? String(fundDefaultAmount) : ""))

  // Use controlled or internal open state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  // Handle amountType change - auto-fill or clear amount
  useEffect(() => {
    if (amountType === "USE_DEFAULT" && fundDefaultAmount) {
      setAmount(String(fundDefaultAmount))
    } else if (amountType === "AD_HOC") {
      // If editing and there's an existing amount, preserve it
      // Otherwise, clear the field for new entry
      if (editingLDA && editingLDA.amount) {
        setAmount(String(editingLDA.amount))
      } else if (!editingLDA) {
        // Only clear if creating new, not editing
        setAmount("")
      }
    }
  }, [amountType, fundDefaultAmount, editingLDA])

  // Update form when editingLDA changes
  useEffect(() => {
    if (editingLDA) {
      setSelectedLDA(String(editingLDA.id))
      setDescription(editingLDA.description || "")
      setStartDate(new Date(editingLDA.fundingStart))
      setEndDate(new Date(editingLDA.fundingEnd))
      setFundingStatus(editingLDA.fundingStatus)
      setAmountType(editingLDA.amountType || "USE_DEFAULT")
      setAmount(editingLDA.amount ? String(editingLDA.amount) : (fundDefaultAmount ? String(fundDefaultAmount) : ""))
    } else {
      // Reset form when not editing
      setSelectedLDA("")
      setDescription("")
      setStartDate(undefined)
      setEndDate(undefined)
      setFundingStatus("Active")
      setAmountType("USE_DEFAULT")
      setAmount(fundDefaultAmount ? String(fundDefaultAmount) : "")
    }
  }, [editingLDA, fundDefaultAmount])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedLDA || !startDate || !endDate || !amount) {
      toast.error("Please fill in all required fields")
      return
    }

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    setLoading(true)

    try {
      const isEditing = !!editingLDA
      const response = await fetch(`/api/fund-lda`, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fundId: fundId,
          localDevelopmentAgencyId: isEditing ? editingLDA.localDevelopmentAgencyId : parseInt(selectedLDA),
          description: description,
          fundingStart: startDate.toISOString(),
          fundingEnd: endDate.toISOString(),
          fundingStatus: fundingStatus,
          amountType: amountType,
          amount: parsedAmount,
        }),
      })

      if (!response.ok) {
        throw new Error(isEditing ? "Failed to update funding" : LDA_TERMINOLOGY.linkError)
      }

      toast.success(isEditing ? "Funding updated successfully" : LDA_TERMINOLOGY.linkedSuccess)
      setOpen(false)
      
      // Reset form
      setSelectedLDA("")
      setDescription("")
      setStartDate(undefined)
      setEndDate(undefined)
      setFundingStatus("Active")
      setAmountType("USE_DEFAULT")
      setAmount(fundDefaultAmount ? String(fundDefaultAmount) : "")
      
      if (callback) {
        callback()
      }
    } catch {
      toast.error(editingLDA ? "Failed to update funding" : LDA_TERMINOLOGY.linkError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!editingLDA && (
        <DialogTrigger asChild>
          <Button size="sm" className="h-9 bg-gray-900 hover:bg-gray-800 text-white">
            <PlusIcon className="h-4 w-4 mr-1" />
            {LDA_TERMINOLOGY.linkLabel}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] max-w-2xl w-full p-0 gap-0 flex flex-col">
        <DialogHeader className="p-5 border-b">
          <DialogTitle>{LDA_TERMINOLOGY.linkToFundLabel}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex-grow contents">
          <div className="flex-grow overflow-y-auto">
            <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: 'calc(90vh - 220px)' }}>
              <div className="space-y-4 mt-4">
              {/* Fund field - only show when fundName is provided */}
              {fundName && (
                <div className="space-y-2">
                  <Label htmlFor="fund">Fund</Label>
                  <div className="flex items-center justify-between h-10 w-full rounded-md border border-input bg-gray-100 px-3 py-2 text-sm">
                    <span>{fundName}</span>
                    <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </div>
              )}

              {/* LDA Selection */}
              <div className="space-y-2">
                <Label htmlFor="lda">{LDA_TERMINOLOGY.nameLabel}</Label>
                {editingLDA ? (
                  <div className="flex items-center justify-between h-10 w-full rounded-md border border-input bg-gray-100 px-3 py-2 text-sm">
                    <span>{editingLDA.localDevelopmentAgency.name}</span>
                    <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                ) : (
                  <Select value={selectedLDA} onValueChange={setSelectedLDA}>
                    <SelectTrigger id="lda">
                      <SelectValue placeholder={LDA_TERMINOLOGY.selectPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLDAs.map((lda) => (
                        <SelectItem key={lda.id} value={String(lda.id)}>
                          {lda.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Why has this {LDA_TERMINOLOGY.shortName} been selected to receive these funds?</Label>
                <Textarea
                  id="description"
                  placeholder="Enter details here"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="resize-none"
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

              {/* Amount Type and Amount */}
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="amountType">Amount type</Label>
                  <Select value={amountType} onValueChange={setAmountType}>
                    <SelectTrigger id="amountType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USE_DEFAULT">Use default</SelectItem>
                      <SelectItem value="AD_HOC">Ad hoc</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 space-y-2">
                  <Label htmlFor="amount">Amount <span className="text-red-500">*</span></Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="R 0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={amountType === "USE_DEFAULT"}
                    required
                  />
                </div>
              </div>

              {/* Funding Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Funding status</Label>
                <Select value={fundingStatus} onValueChange={setFundingStatus}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Paused">Paused</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            </div>
          </div>
          <DialogFooter className="flex sm:justify-between flex-col sm:flex-row gap-2 px-4 pb-4 pt-2 border-t mt-auto">
            <Button type="button" onClick={() => setOpen(false)} variant="secondary" className="sm:order-1 order-2">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="sm:order-2 order-1">
              {loading ? (editingLDA ? "Updating..." : "Linking...") : (editingLDA ? "Update Funding" : LDA_TERMINOLOGY.linkToFundLabel)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
