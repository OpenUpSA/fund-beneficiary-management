"use client"

import { Field } from "@/types/forms"
import * as React from "react"
import { useState, useEffect } from "react"
import { InputMultiSelect, InputMultiSelectTrigger } from "@/components/ui/multiselect"

interface MultiSelectProps {
  field: Field
  isEditing: boolean
  lda_id?: number
  onValueChange?: (field: Field, value: string) => void
}

interface Option {
  value: string
  label: string
}

export function MultiSelect({ field, isEditing, onValueChange, lda_id }: MultiSelectProps) {
  const [options, setOptions] = useState<Option[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // If options are already provided, use them
    if (field.options && field.options.length > 0) {
      setOptions(field.options.map(option => ({
        value: option.value,
        label: option.label
      })))
      return
    }
    // Otherwise, check if we need to fetch options dynamically
    if (field.config?.dynamicOptionTable) {
      setIsLoading(true)
      // Determine which API to call based on dynamicOptionTable
      let apiUrl = ''
      switch (field.config?.dynamicOptionTable) {
        case 'funders':
          apiUrl = '/api/funder-list'
          break
        case 'staff_members':
          apiUrl = `/api/lda/${lda_id}/staff?is_committee=false`
          break
        case 'committee_members':
          apiUrl = `/api/lda/${lda_id}/staff?is_committee=true`
          break
        // Add more cases as needed
        default:
          setOptions([])
          setIsLoading(false)
          return
      }
      // Fetch options from the API
      fetch(apiUrl)
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to fetch options')
          }
          return response.json()
        })
        .then(data => {
          if (field.config?.dynamicOptionTable === 'staff_members' || field.config?.dynamicOptionTable === 'committee_members') {
            const fetchedOptions = data.map((item: { id: string | number, firstName: string, lastName: string }) => ({
              value: item.id.toString(),
              label: `${item.firstName} ${item.lastName}`
            }))
            setOptions(fetchedOptions)
          } else {
            const fetchedOptions = data.map((item: { id: string | number, name: string }) => ({
              value: item.id.toString(),
              label: item.name
            }))
            setOptions(fetchedOptions)
          }
        })
        .catch(error => {
          console.error('Error fetching options:', error)
          setOptions([{ value: 'error', label: 'Error loading options' }])
        })
        .finally(() => {
          setIsLoading(false)
        })
    } else {
      // Default fallback if no options source is specified
      setOptions([{ value: 'default', label: 'No options available' }])
    }
  }, [field.options, field.config?.dynamicOptionTable, lda_id])

  return (
    <div className="flex flex-col gap-1">
      <InputMultiSelect
        options={options}
        value={field.value?.split(',').filter(Boolean) || []}
        onValueChange={(values) => {
          if (onValueChange) {
            onValueChange(field, values.join(','))
          }
        }}
        placeholder={isLoading ? "Loading options..." : (field.placeholder || "Select options...")}
        disabled={!isEditing || isLoading}
      >
        {(provided) => <InputMultiSelectTrigger {...provided} />}
      </InputMultiSelect>
    </div>
  )
}
