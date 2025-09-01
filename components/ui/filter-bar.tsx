"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { FilterButton, FilterOption } from "@/components/ui/filter-button"
import { XIcon } from "lucide-react"

interface FilterBarProps {
  onFilterChange?: (filterType: string, selectedOptions: FilterOption[]) => void
  onResetFilters?: () => void
  filterConfigs: {
    type: string
    label: string
    options: FilterOption[]
    customFilterComponent?: React.ComponentType<{ filterType: string, onFilterChange: (filterType: string, selectedOptions: FilterOption[]) => void, activeFilters: Record<string, FilterOption[]> }>
  }[]
  activeFilters?: Record<string, FilterOption[]>
  className?: string
}

export function FilterBar({
  onFilterChange,
  onResetFilters,
  filterConfigs,
  activeFilters,
  className,
}: FilterBarProps) {

  const handleFilterChange = (filterType: string, selectedOptions: FilterOption[]) => {
    if (onFilterChange) {
      onFilterChange(filterType, selectedOptions)
    }
  }

  const handleResetFilters = () => {
    if (onResetFilters) {
      onResetFilters()
    }
  }

  const hasActiveFilters = Object.values(activeFilters || {}).some(filters => filters.length > 0)

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {filterConfigs.map((config) => {
        // Use custom filter component if provided
        if (config.customFilterComponent) {
          const CustomFilterComponent = config.customFilterComponent;
          return (
            <CustomFilterComponent
              key={config.type}
              filterType={config.type}
              onFilterChange={handleFilterChange}
              activeFilters={activeFilters || {}}
            />
          );
        }
        
        // Otherwise use default FilterButton
        return (
          <FilterButton
            key={config.type}
            label={config.label}
            options={config.options}
            selectedOptions={activeFilters?.[config.type] || []}
            onFilterChange={(selectedOptions) => 
              handleFilterChange(config.type, selectedOptions)
            }
          />
        );
      })}
      
      {hasActiveFilters && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-9 flex items-center gap-1"
          onClick={handleResetFilters}
        >
          <span>Reset</span>
          <XIcon size={16} />
        </Button>
      )}
    </div>
  )
}
