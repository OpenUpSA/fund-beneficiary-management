"use client"

import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { useEffect, useState, useCallback } from "react"
import { Contact } from "@prisma/client"
import { FormDialog as ContactFormDialog } from "@/components/contacts/form"
import { FilterBar } from "@/components/ui/filter-bar"
import { FilterOption } from "@/components/ui/filter-button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertCircle, InfoIcon, MoreHorizontal, Trash2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { toast } from "sonner"


interface Props {
  contacts: Contact[],
  ldaId: number,
  dataChanged: () => void
}

export function FilteredContacts({ contacts, dataChanged, ldaId }: Props) {

  const [searchTerm, setSearchTerm] = useState("")
  const [activeFilters, setActiveFilters] = useState<Record<string, FilterOption[]>>({})
  const [isDeleting, setIsDeleting] = useState(false)
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null)

  // Extract unique positions for the role filter
  const availablePositions = [
    ...new Set(contacts.map(contact => contact.position).filter(Boolean))
  ].map(position => ({
    id: position,
    label: position,
  }))

  const positionOptions: FilterOption[] = availablePositions.map(({ id, label }) => ({ id, label }))

  const filterConfigs = [
    { type: 'position', label: 'Role', options: positionOptions },
  ].filter(Boolean) as { type: string, label: string, options: FilterOption[] }[]

  const handleSearch = (term: string) => setSearchTerm(term)

  const handleFilterChange = useCallback((filterType: string, selectedOptions: FilterOption[]) => {
    setActiveFilters({
      ...activeFilters,
      [filterType]: selectedOptions,
    })
  }, [activeFilters])

  const handleResetFilters = () => {
    setSearchTerm("")
    setActiveFilters({})
    setFilteredContacts(contacts)
  }
  
  const handleDeleteContact = async () => {
    if (!contactToDelete) return
    
    setIsDeleting(true)
    const toastId = toast.loading('Deleting contact...')
    
    try {
      const response = await fetch(`/api/lda/${ldaId}/contact/${contactToDelete.id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete contact')
      }
      
      toast.dismiss(toastId)
      toast.success('Contact deleted')
      
      dataChanged()
    } catch (error) {
      console.error('Error deleting contact:', error)
      toast.dismiss(toastId)
      toast.error('Failed to delete contact', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsDeleting(false)
      setContactToDelete(null)
    }
  }

  const [filteredContacts, setFilteredContacts] = useState<Contact[]>(contacts)

  useEffect(() => {
    const filtered = contacts.filter((item) => {
      const selectedPositions = (activeFilters['position'] || []).map(o => o.id)

      const positionMatch = selectedPositions.length === 0 || 
        (item.position && selectedPositions.includes(item.position))

      const searchMatch =
        searchTerm.trim() === "" ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.email && item.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.contactNumber && item.contactNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.position && item.position.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.info && item.info.toLowerCase().includes(searchTerm.toLowerCase()))

      return positionMatch && searchMatch
    })

    setFilteredContacts(filtered)
  }, [activeFilters, searchTerm, contacts])

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Input
              type="search"
              id="search"
              placeholder="Filter contacts..."
              className="pr-8 h-9"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <FilterBar
            onFilterChange={handleFilterChange}
            onResetFilters={handleResetFilters}
            filterConfigs={filterConfigs}
            activeFilters={activeFilters}
            className="hidden md:flex"
          />
        </div>
        {ldaId && (
          <ContactFormDialog
            ldaId={ldaId}
            callback={dataChanged}
          />
        )}
      </div>

      <Card className="w-full text-slate-700">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Info</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts && filteredContacts.length > 0 ? (
                filteredContacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">
                      {contact.name}
                    </TableCell>
                    <TableCell>{contact.position}</TableCell>
                    <TableCell>{contact.contactNumber}</TableCell>
                    <TableCell className="text-slate-700">{contact.email}</TableCell>
                    <TableCell>
                      {contact.info && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                <InfoIcon className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[20rem]">
                              {contact.info}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <ContactFormDialog
                              key={contact.id}
                              contact={contact}
                              ldaId={ldaId}
                              callback={dataChanged}
                            />
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setContactToDelete(contact)}>
                            <div className="flex items-center gap-2 text-destructive">
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </div>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                    No contacts found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!contactToDelete} onOpenChange={(open) => !open && setContactToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the contact <strong>{contactToDelete?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteContact}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}