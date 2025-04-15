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

import { FundingStatus, Location, FocusArea, Funder } from '@prisma/client'
import { FundFull } from '@/types/models'

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

interface FormDialogProps {
  fund?: FundFull
  funders: Funder[]
  fundingStatuses: FundingStatus[]
  locations: Location[]
  focusAreas: FocusArea[]
  callback: () => void
}

const FormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  about: z.string().min(2, { message: "About must be at least 2 characters." }),
  fundingStatusId: z.coerce.number({ required_error: "Please select a funding status." }),
  funderId: z.coerce.number({ required_error: "Please select a funder." }),
  locations: z.array(z.number()).min(1, { message: "Please select at least one location." }),
  amount: z.coerce.number({ required_error: "Please enter an amount." }),
  focusAreas: z.array(z.number()).min(1, { message: "Please select at least one focus area." }),
  fundingStart: z.date({ required_error: "Please select a funding start." }).refine(date => date !== undefined, {
    message: "Funding start is required."
  }),
  fundingEnd: z.date({ required_error: "Please select a funding end." }).refine(date => date !== undefined, {
    message: "Funding end is required."
  }),
})

export function FormDialog({ funders, fund, fundingStatuses, locations, focusAreas, callback }: FormDialogProps) {
  const [open, setOpen] = useState(false)

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: fund ? fund.name : "",
      about: fund ? fund.about : "",
      amount: fund ? Number(fund.amount) : 0,
      fundingStatusId: fund ? fund.fundingStatusId : fundingStatuses[0].id,
      locations: fund ? fund.locations.map((location: Location) => location.id) : [],
      focusAreas: fund ? fund.focusAreas.map((focusArea: FocusArea) => focusArea.id) : [],
      fundingStart: fund ? new Date(fund.fundingStart) : new Date(),
      fundingEnd: fund ? new Date(fund.fundingEnd) : new Date(),
      funderId: fund ? fund.funderId : funders[0].id
    },
  })

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setOpen(false)

    if (fund) {
      toast({
        title: 'Updating fund...',
        variant: 'processing'
      })
      await fetch(`/api/funder/${data.funderId}/fund/${fund?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      toast({
        title: 'Fund updated',
        variant: 'success'
      })
    } else {
      toast({
        title: 'Creating fund...',
        variant: 'processing'
      })
      await fetch(`/api/funder/${data.funderId}/fund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      toast({
        title: 'Fund created',
        variant: 'success'
      })
    }

    callback()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          {fund ? <>
            <span className="hidden md:inline">Edit details</span>
            <PencilIcon />
          </>
            : <>
              <span className="hidden md:inline">Add fund</span>
              <PlusIcon />
            </>}
        </Button>
      </DialogTrigger>
      <DialogContent className="min-w-[40vw]">
        <DialogHeader>
          <DialogTitle>{fund ? "Edit" : "Add"} fund</DialogTitle>
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

              {!fund && (
                <FormField
                  control={form.control}
                  name="funderId"
                  render={({ field }) => (
                    <FormItem className="flex-1 w-full">
                      <FormLabel>Funder</FormLabel>
                      <Select value={field.value?.toString()} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {funders.map((funder) => (
                            <SelectItem
                              key={funder.id}
                              value={funder.id.toString()}
                            >
                              {funder.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                    </FormItem>
                  )} />)}
            </div>

            <div className="flex gap-4">
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
            </div>

            <div className="flex gap-4">

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
            </div>

            <FormField
              control={form.control}
              name="focusAreas"
              render={({ field }) => (
                <FormItem>
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

          </form>
        </Form>
        <DialogFooter>
          <Button type="submit" onClick={form.handleSubmit(onSubmit)}>{fund ? "Save changes" : "Create Fund"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog >
  )
}
