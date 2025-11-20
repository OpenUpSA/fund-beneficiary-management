"use client"

import * as React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { CirclePlusIcon } from "lucide-react"

export interface FilterOption {
  id: string | number
  label: string
  value?: string | number
  from?: Date | string
  to?: Date | string
}

interface FilterButtonProps {
  label?: string
  name?: string
  options: FilterOption[]
  selectedOptions: FilterOption[]
  onFilterChange?: (selectedOptions: FilterOption[]) => void
  className?: string
  from?: string
  to?: string
}

export function FilterButton({
  label,
  options,
  selectedOptions,
  onFilterChange,
}: FilterButtonProps) {
  const [open, setOpen] = useState(false)

  const handleOptionToggle = (option: FilterOption) => {
    const isSelected = selectedOptions.some((item) => item.id === option.id)
    const newSelection = isSelected
      ? selectedOptions.filter((item) => item.id !== option.id)
      : [...selectedOptions, option]
    if (onFilterChange) {
      onFilterChange(newSelection)
    }
  }


  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-9 flex items-center gap-1 border border-gray-300 border-dashed text-slate-500"
        >
            <CirclePlusIcon size={16} />
            <span>{label}</span>
            {selectedOptions.length > 0 &&
            <span className="flex items-center border-l border-gray-300 pl-2 ml-2">
              <Badge variant="secondary" className="rounded-sm">
                {selectedOptions.length} selected
              </Badge>
            </span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <div className="p-2">
          <div className="font-medium mb-2">{label}</div>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {options.map((option) => (
              <div 
                key={option.id} 
                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                onClick={() => handleOptionToggle(option)}
              >
                <Checkbox 
                  id={`filter-${label}-${option.id}`}
                  checked={selectedOptions.some(item => item.id === option.id)}
                  onCheckedChange={() => handleOptionToggle(option)}
                />
                <label 
                  htmlFor={`filter-${label}-${option.id}`}
                  className="text-sm cursor-pointer flex-grow"
                >
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        </div>
        
        <div className="border-t p-2 flex justify-between">
        {selectedOptions.length > 0 && (<Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onFilterChange?.([])}
            className="text-sm h-8"
        >
            Clear
        </Button>)}
        <Button 
            size="sm" 
            onClick={() => setOpen(false)}
            className="text-sm h-8 ml-auto"
        >
            Done
        </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
