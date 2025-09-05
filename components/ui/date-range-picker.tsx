"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { FilterOption } from "./filter-button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { CirclePlusIcon } from "lucide-react"

interface DateRangePickerProps {
  dateRange: DateRange | undefined
  setDateRange: (dateRange: DateRange | undefined) => void
  className?: string
}

export function DateRangePicker({
  dateRange,
  setDateRange,
  className,
}: DateRangePickerProps) {
  // Use a local state to track changes before propagating them up
  const [localDateRange, setLocalDateRange] = React.useState<DateRange | undefined>(dateRange);
  
  // Update local state when props change
  React.useEffect(() => {
    setLocalDateRange(dateRange);
  }, [dateRange]);
  
  // Handle selection and propagate changes up only when complete
  const handleSelect = (newRange: DateRange | undefined) => {
    setLocalDateRange(newRange);
    
    // Only propagate complete date ranges to avoid unnecessary rerenders
    if (newRange?.from && newRange?.to) {
      setDateRange(newRange);
    }
  };
  
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !localDateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {localDateRange?.from ? (
              localDateRange.to ? (
                <>
                  {format(localDateRange.from, "LLL dd, y")} -{" "}
                  {format(localDateRange.to, "LLL dd, y")}
                </>
              ) : (
                format(localDateRange.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={localDateRange?.from}
            selected={localDateRange}
            onSelect={handleSelect}
            captionLayout="dropdown"
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

interface CustomDateFilterProps {
  filterType: string
  onFilterChange: (filterType: string, selectedOptions: FilterOption[]) => void
  activeFilters: Record<string, FilterOption[]>
}

export function CustomDateFilter({
  filterType,
  onFilterChange,
  activeFilters,
}: CustomDateFilterProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>()
  
  const options = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'last7days', label: 'Last 7 days' },
    { id: 'last30days', label: 'Last 30 days' },
    { id: 'thisMonth', label: 'This month' },
    { id: 'lastMonth', label: 'Last month' },
    { id: 'custom', label: 'Custom range' },
  ]

  // Get the currently selected options for this filter type
  const selectedOptions = React.useMemo(() => activeFilters[filterType] || [], [activeFilters, filterType])
  const selectedOptionId = React.useMemo(() => 
    selectedOptions.length > 0 ? 
    (selectedOptions[0].id === 'customRange' ? 'custom' : selectedOptions[0].id) : 
    null
  , [selectedOptions])
  
  // Handle option selection
  const handleOptionSelect = (optionId: string) => {
    const option = options.find(o => o.id === optionId)
    if (!option) return
    
    // Reset date range when selecting any option other than custom
    if (optionId !== 'custom') {
      setDateRange(undefined);
    }
    
    // For predefined options, update the filter immediately
    onFilterChange(filterType, [{ id: option.id, label: option.label }])
  }
  
  // Create a ref to track previous date range to prevent infinite loops
  const prevDateRangeRef = React.useRef<string | null>(null);
  const prevSelectedOptionIdRef = React.useRef<string | number |null>(selectedOptionId);
  
  // Reset date range when selected option changes from custom to something else
  React.useEffect(() => {
    // If we switched from custom to another option, reset the date range
    if (prevSelectedOptionIdRef.current === 'custom' && selectedOptionId !== 'custom') {
      setDateRange(undefined);
      prevDateRangeRef.current = null;
    }
    
    prevSelectedOptionIdRef.current = selectedOptionId;
  }, [selectedOptionId, setDateRange]);
  
  // Handle date range selection
  const handleDateRangeChange = (newDateRange: DateRange | undefined) => {
    setDateRange(newDateRange);
    
    // Only update filter when we have a complete date range
    if (newDateRange?.from && newDateRange?.to && selectedOptionId === 'custom') {
      // Create a unique key for this date range
      const dateRangeKey = `${newDateRange.from.toISOString()}-${newDateRange.to.toISOString()}`;
      
      // Only update if this is a new date range
      if (prevDateRangeRef.current !== dateRangeKey) {
        prevDateRangeRef.current = dateRangeKey;
        
        onFilterChange(filterType, [{
          id: 'customRange',
          label: `${format(newDateRange.from, 'MMM d, yyyy')} - ${format(newDateRange.to, 'MMM d, yyyy')}`,
          from: newDateRange.from,
          to: newDateRange.to
        }]);
      }
    }
  };
  
  // Display the selected option or custom range
  const displayText = React.useMemo(() => {
    if (selectedOptions.length === 0) {
      return ""
    }
    
    const option = selectedOptions[0]
    if (option.id === 'customRange' && option.from && option.to) {
      return `${format(new Date(option.from), 'MMM d')} - ${format(new Date(option.to), 'MMM d')}`
    }
    
    return `${option.label}`
  }, [selectedOptions])
  
  return (
    <div className="relative">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
        <Button
          variant="outline" 
          size="sm" 
          className="h-9 flex items-center gap-1 border border-gray-300 border-dashed text-slate-500"
          >
            <CirclePlusIcon size={16} />
            <span>Date added</span>
            {displayText.length > 0 &&
            <span className="flex items-center border-l border-gray-300 pl-2 ml-2">
              <Badge variant="secondary" className="rounded-sm">
                {displayText}
              </Badge>
            </span>}
            
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[300px] p-0">
          <Card>
            <CardContent className="p-4 space-y-4">
              <RadioGroup 
                value={selectedOptionId?.toString() || ''} 
                onValueChange={handleOptionSelect}
                className="space-y-2"
              >
                {options.map((option) => (
                  <div key={option.id}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value={option.id} id={`radio-${option.id}`} />
                      <Label 
                        htmlFor={`radio-${option.id}`} 
                        className="cursor-pointer"
                      >
                        {option.label}
                      </Label>
                    </div>
                    
                    {option.id === 'custom' && selectedOptionId === 'custom' && (
                      <div className="pt-2 pl-6 mt-2">
                        <DateRangePicker 
                          dateRange={dateRange} 
                          setDateRange={handleDateRangeChange} 
                        />
                      </div>
                    )}
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>
    </div>
  )
}
