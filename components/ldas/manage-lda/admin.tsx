"use client"

import { 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel 
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { InputMultiSelect, InputMultiSelectTrigger } from "@/components/ui/multiselect"
import { FocusArea, DevelopmentStage, User } from '@prisma/client'
import { UseFormReturn } from "react-hook-form"

import { FormValues } from "./form-schema"
import { RegistrationStatus, OrganisationStatus } from "@/constants/lda"

interface AdminTabProps {
  form: UseFormReturn<FormValues>
  focusAreas: FocusArea[]
  developmentStages: DevelopmentStage[]
  programmeOfficers: User[]
}

export function AdminTab({ 
  form, 
  focusAreas, 
  developmentStages, 
  programmeOfficers 
}: AdminTabProps) {
  return (
    <div className="space-y-4 mt-4">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input placeholder="LDA name" {...field} />
            </FormControl>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="about"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Organisational summary</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Enter details here" 
                className="min-h-[80px] resize-none"
                {...field} 
              />
            </FormControl>
          </FormItem>
        )}
      />
    <div className="space-y-2">
        <FormField
            control={form.control}
            name="registrationStatus"
            render={({ field }) => (
            <FormItem>
                <FormLabel>NPO/BPO Registration status</FormLabel>
                <Select value={field.value?.toString()} onValueChange={field.onChange}>
                <FormControl>
                    <SelectTrigger>
                    <SelectValue placeholder="Registered NPO" />
                    </SelectTrigger>
                </FormControl>
                <SelectContent>
                    {Object.entries(RegistrationStatus).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value}
                      </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </FormItem>
        )} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="registrationCode"
                render={({ field }) => (
                <FormItem>
                    <FormControl>
                        <Input placeholder="Registration code" {...field} />
                    </FormControl>
                </FormItem>
            )} />
            
            <FormField
                control={form.control}
                name="registrationDate"
                render={({ field }) => (
                <FormItem>
                    <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                    variant={"outline"}
                                    className="w-full pl-3 text-left font-normal text-gray-500"
                                >
                                    {field.value ? format(field.value, "dd MMM yyyy") : "Pick a date"}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                    date < new Date("1900-01-01")
                                }
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </FormItem>
            )} />
        </div>
    </div>
      <FormField
        control={form.control}
        name="focusAreas"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Focus areas</FormLabel>
            <InputMultiSelect
              options={focusAreas.map((focusArea) => ({
                value: focusArea.id.toString(),
                label: focusArea.label,
              }))}
              value={field.value?.map(String) ?? []}
              onValueChange={(values: string[]) => field.onChange(values.map(Number))}
              placeholder="select focus areas"
            >
              {(provided) => <InputMultiSelectTrigger {...provided} />}
            </InputMultiSelect>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="developmentStageId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Development stage</FormLabel>
            <Select value={field.value?.toString()} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Established" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {developmentStages.map((developmentStage) => (
                  <SelectItem
                    key={developmentStage.id}
                    value={developmentStage.id.toString()}
                  >
                    {developmentStage.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
        )} />

      <FormField
        control={form.control}
        name="programmeOfficerId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Assigned programme officer</FormLabel>
            <Select value={field.value?.toString()} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="James Smith" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {programmeOfficers.map((programmeOfficer) => (
                  <SelectItem
                    key={programmeOfficer.id}
                    value={programmeOfficer.id.toString()}
                  >
                    {programmeOfficer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
        )} />

        <FormField
          control={form.control}
          name="organisationStatus"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select value={field.value?.toString()} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Active" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(OrganisationStatus).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
    </div>
  )
}