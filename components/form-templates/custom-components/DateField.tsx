"use client"

import { Field } from "@/types/forms"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"

interface DateFieldProps {
  field: Field
  isEditing: boolean
  onValueChange?: (field: Field, value: string) => void
}

export function DateField({ field, isEditing, onValueChange }: DateFieldProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className="w-full pl-3 text-left font-normal"
          disabled={!isEditing}
        >
          {field.value ? 
            format(new Date(field.value), "dd MMM yyyy") : 
            (field?.placeholder || "Pick a date")}
          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={field.value ? new Date(field.value) : undefined}
          onSelect={(date) => {
            if (date && onValueChange) {
              onValueChange(field, date.toISOString())
            }
          }}
          disabled={(date) => {
            if (date) {
              return date < new Date("1900-01-01")
            }
            return false
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
