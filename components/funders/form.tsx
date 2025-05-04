"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { FundingStatus, Location, FocusArea } from '@prisma/client'
import { FunderFull } from '@/types/models'

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { CalendarIcon, PencilIcon, PlusIcon } from "lucide-react"
import { useState } from "react"
import { InputMultiSelect, InputMultiSelectTrigger } from "../ui/multiselect";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { format } from "date-fns"
import { Calendar } from "../ui/calendar";

const FormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  about: z.string().min(2, { message: "About must be at least 2 characters." }),
  fundingStatusId: z.coerce.number({ required_error: "Please select a funding status." }),
  locations: z.array(z.number()).min(1, { message: "Please select at least one location." }),
  focusAreas: z.array(z.number()).min(1, { message: "Please select at least one focus area." }),
  amount: z.coerce.number({ required_error: "Please enter an amount." }),
  fundingStart: z.date({ required_error: "Please select a funding start." }).refine(date => date !== undefined, {
    message: "Funding start is required."
  }),
  fundingEnd: z.date({ required_error: "Please select a funding end." }).refine(date => date !== undefined, {
    message: "Funding end is required."
  }),
})

interface FormDialogProps {
  funder?: FunderFull
  fundingStatuses: FundingStatus[]
  locations: Location[]
  focusAreas: FocusArea[]
  callback: () => void
}

export function FormDialog({ funder, fundingStatuses, locations, focusAreas, callback }: FormDialogProps) {
  const [open, setOpen] = useState(false)

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: funder ? funder.name : "",
      about: funder ? funder.about : "",
      fundingStatusId: funder ? funder.fundingStatusId : fundingStatuses[0].id,
      locations: funder ? funder.locations.map((location: Location) => location.id) : [],
      amount: funder ? Number(funder.amount) : 0,
      focusAreas: funder ? funder.focusAreas.map((focusArea: FocusArea) => focusArea.id) : [],
      fundingStart: funder ? new Date(funder.fundingStart) : new Date(),
      fundingEnd: funder ? new Date(funder.fundingEnd) : new Date()
    },
  })

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setOpen(false)

    if (funder) {
      toast({
        title: 'Updating funder...',
        variant: 'processing'
      })
      await fetch(`/api/funder/${funder?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      toast({
        title: 'Funder updated',
        variant: 'success'
      })
    } else {
      toast({
        title: 'Creating funder...',
        variant: 'processing'
      })
      await fetch(`/api/funder/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      toast({
        title: 'Funder created',
        variant: 'success'
      })
    }

    callback()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          {funder ? <>
            <span className="hidden md:inline">Edit details</span>
            <PencilIcon />
          </>
            : <>
              <span className="hidden md:inline">Add funder</span>
              <PlusIcon />
            </>}
        </Button>
      </DialogTrigger>
      <DialogContent className="min-w-[40vw]">
        <DialogHeader>
          <DialogTitle>{funder ? "Edit" : "Add"} funder</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>

                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="about"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>About</FormLabel>
                  <FormControl>
                    <Textarea rows={5} className="resize-none" {...field} />
                  </FormControl>

                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem className="flex-1 w-full">
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fundingStatusId"
                render={({ field }) => (
                  <FormItem className="flex-1 w-full">
                    <FormLabel>Funding Status</FormLabel>
                    <Select value={field.value?.toString()} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {fundingStatuses.map((fundingStatus) => (
                          <SelectItem
                            key={fundingStatus.id}
                            value={fundingStatus.id.toString()}
                          >
                            {fundingStatus.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                  </FormItem>
                )} />

            </div>

            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="fundingStart"
                render={({ field }) => (
                  <FormItem className="flex-1 w-full">
                    <FormLabel>Funding Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className="w-full pl-3 text-left font-normal"
                          >
                            {field.value ? format(field.value, "PPP") : "Pick a date"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fundingEnd"
                render={({ field }) => (
                  <FormItem className="flex-1 w-full">
                    <FormLabel>Funding End</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className="w-full pl-3 text-left font-normal"
                          >
                            {field.value ? format(field.value, "PPP") : "Pick a date"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="locations"
                render={({ field }) => (
                  <FormItem className="flex-1 w-full">
                    <FormLabel>Locations</FormLabel>
                    <InputMultiSelect
                      options={locations.map((location) => ({
                        value: location.id.toString(),
                        label: location.label,
                      }))}
                      value={field.value.map(String)}
                      onValueChange={(values: string[]) => field.onChange(values.map(Number))}
                      placeholder="Select locations"
                    >
                      {(provided) => <InputMultiSelectTrigger {...provided} />}
                    </InputMultiSelect>

                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="focusAreas"
                render={({ field }) => (
                  <FormItem className="flex-1 w-full">
                    <FormLabel>Focus Areas</FormLabel>
                    <InputMultiSelect
                      options={focusAreas.map((location) => ({
                        value: location.id.toString(),
                        label: location.label,
                      }))}
                      value={field.value.map(String)}
                      onValueChange={(values: string[]) => field.onChange(values.map(Number))}
                      placeholder="Select focus areas"
                    >
                      {(provided) => <InputMultiSelectTrigger {...provided} />}
                    </InputMultiSelect>

                  </FormItem>
                )}
              />

            </div>

          </form>
        </Form>
        <DialogFooter>
          <Button type="submit" onClick={form.handleSubmit(onSubmit)}>{funder ? "Save changes" : "Create Funder"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog >
  )
}
