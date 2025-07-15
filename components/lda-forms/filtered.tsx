"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState, useCallback, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { LocalDevelopmentAgencyFormFull, LocalDevelopmentAgencyFull, FormTemplateWithRelations } from "@/types/models"
import { format } from "date-fns"
import { AlertTriangleIcon, Clock3Icon, MoreHorizontal } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { FilterBar } from "@/components/ui/filter-bar"
import { FilterOption } from "@/components/ui/filter-button"
import { FormDialog } from "./form"
import Link from "next/link"
import { FormStatus } from "@prisma/client"

interface Props {
  ldaForms: LocalDevelopmentAgencyFormFull[]
  lda?: LocalDevelopmentAgencyFull
  formTemplates: FormTemplateWithRelations[]
  formStatuses: FormStatus[]
  dataChanged?: () => Promise<void>
  navigatedFrom?: string
}

export function FilteredLDAForms({ ldaForms, lda, formTemplates = [], formStatuses = [], dataChanged }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredForms, setFilteredForms] = useState(ldaForms);
  const [activeFilters, setActiveFilters] = useState<Record<string, FilterOption[]>>({});

  // Filter configurations
  const typeOptions: FilterOption[] = formTemplates.map(template => ({
    id: template.id,
    label: template.name
  }));

  const statusOptions: FilterOption[] = formStatuses.map(status => ({
    id: status.id,
    label: status.label
  }));

  const yearOptions: FilterOption[] = [
    { id: '2025', label: '2025' },
    { id: '2024', label: '2024' },
    { id: '2023', label: '2023' },
    { id: '2022', label: '2022' }
  ];

  const reportingOptions: FilterOption[] = [
    { id: 'overdue', label: 'Overdue' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'completed', label: 'Completed' },
    { id: 'none', label: 'None' }
  ];

  const filterConfigs = [
    { type: 'type', label: 'Type', options: typeOptions },
    { type: 'status', label: 'Status', options: statusOptions },
    { type: 'year', label: 'Year', options: yearOptions },
    { type: 'reporting', label: 'Reporting', options: reportingOptions }
  ];

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleFilterChange = useCallback(
    (filterType: string, selectedOptions: FilterOption[]) =>{
      setActiveFilters( {
        ...activeFilters,
        [filterType]: selectedOptions
      });
    }, [activeFilters, setActiveFilters]
  );

  const handleResetFilters = () => {
    setSearchTerm("");
    setActiveFilters({});
    setFilteredForms(ldaForms);
  };

  useEffect(() => {
    const filtered = ldaForms.filter((ldaForm) => {
      const searchMatch =
        searchTerm === "" ||
        ldaForm.title.toLowerCase().includes(searchTerm.toLowerCase())

      // TODO: Implement filter logic
      return searchMatch
    })
    setFilteredForms(filtered)
  }, [searchTerm, ldaForms, activeFilters])

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Funding Applications</h1>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Input
              type="search"
              id="search"
              placeholder="Filter applications..."
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
          />
        </div>
        
        {lda && (
          // open form dialog 
          <FormDialog
            formTemplates={formTemplates}
            formStatuses={formStatuses}
            lda={lda}
            callback={() => dataChanged && dataChanged()}
          />
        )}
      </div>
      
      <div className="border rounded-md">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="font-medium">Name</TableHead>
              <TableHead className="font-medium text-right">Amount</TableHead>
              <TableHead className="font-medium">Status</TableHead>
              <TableHead className="font-medium">Submitted</TableHead>
              <TableHead className="font-medium">Approved</TableHead>
              <TableHead className="font-medium">Reporting status</TableHead>
              <TableHead className="font-medium">Form</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredForms.map((ldaForm, index) => {
              // Generate demo data for the example
              const getStatusBadge = () => {
                // Adding keys to each status badge element to prevent React key warnings
                if (ldaForm.formStatus.label === "Draft") return <div key={`status-${ldaForm.id}-draft`} className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400"></span> Draft</div>;
                if (ldaForm.formStatus.label === "In Progress") return <div key={`status-${ldaForm.id}-progress`} className="flex items-center gap-1 text-blue-600"><span className="w-2 h-2 rounded-full bg-blue-600"></span> Underway</div>;
                if (ldaForm.formStatus.label === "Approved") return <div key={`status-${ldaForm.id}-approved`} className="flex items-center gap-1 text-green-600"><span className="w-2 h-2 rounded-full bg-green-600"></span> Approved</div>;
                if (ldaForm.formStatus.label === "Completed") return <div key={`status-${ldaForm.id}-completed`} className="flex items-center gap-1 text-green-600"><span className="w-2 h-2 rounded-full bg-green-600"></span> Completed</div>;
                return <div key={`status-${ldaForm.id}-other`} className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400"></span> {ldaForm.formStatus.label}</div>;
              };
              
              const getReportingStatus = () => {
                // This is demo data - in a real app you would use actual reporting status data
                if (index === 1) {
                  return (
                    <div className="flex items-center gap-2">
                      <Badge key={`alert-${ldaForm.id}-red`} variant="outline" className="bg-red-50 text-red-600 border-red-200">
                        <AlertTriangleIcon size={12} className="mr-1" /> 3
                      </Badge>
                      <Badge key={`alert-${ldaForm.id}-gray`} variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                        <Clock3Icon size={12} className="mr-1" /> 2
                      </Badge>
                    </div>
                  );
                }
                if (index === 2) {
                  return (
                    <div className="flex items-center gap-2">
                      <Badge key={`alert-${ldaForm.id}-red`} variant="outline" className="bg-red-50 text-red-600 border-red-200">
                        <AlertTriangleIcon size={12} className="mr-1" /> 1
                      </Badge>
                      <Badge key={`alert-${ldaForm.id}-gray`} variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                        <Clock3Icon size={12} className="mr-1" /> 1
                      </Badge>
                    </div>
                  );
                }
                return null;
              };
              
              const isLocked = index === 3 || index === 4 || index === 5;
              
              return (
                <TableRow key={`application-${ldaForm.id}`} className={cn(isLocked ? "text-gray-500" : "")}>
                  <TableCell>
                    {isLocked ? (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">🔒</span>
                        {ldaForm.title}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {ldaForm.title}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {index === 0 ? "Unavailable" : `R${Math.floor(Math.random() * 50000)}`}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge()}
                  </TableCell>
                  <TableCell>
                    {ldaForm.submitted ? format(ldaForm.submitted, 'MMM d, yyyy') : "-"}
                  </TableCell>
                  <TableCell>
                    {ldaForm.approved ? format(ldaForm.approved, 'MMM d, yyyy') : "-"}
                  </TableCell>
                  <TableCell>
                    {getReportingStatus()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-between">
                      <Link href={`/dashboard/ldas/${lda?.id}/applicationsAndReports/${ldaForm.id}`}>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-gray-500 hover:text-gray-700"
                        >
                          View
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}

            {filteredForms.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-gray-500 text-lg">
                  No applications found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="p-2 text-xs text-gray-500 border-t">
          Showing {filteredForms.length} of {ldaForms.length} applications
        </div>
      </div>
    </div>
  );
}