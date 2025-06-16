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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { FundingStatus, Location, FocusArea, Fund, DevelopmentStage, User } from '@prisma/client'
import { LocalDevelopmentAgencyFull } from '@/types/models'

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { CalendarIcon, PencilIcon, PlusIcon, SettingsIcon } from "lucide-react"
import { useState } from "react"
import { InputMultiSelect, InputMultiSelectTrigger } from "../ui/multiselect";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { format } from "date-fns"
import { Calendar } from "../ui/calendar";
import { FundFull } from "@/types/models";

interface FormDialogProps {
  lda?: LocalDevelopmentAgencyFull
  funds: FundFull[]
  fundingStatuses: FundingStatus[]
  locations: Location[]
  developmentStages: DevelopmentStage[]
  focusAreas: FocusArea[]
  programmeOfficers: User[]
  callback: (tag: string) => void
}

const FormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  about: z.string().min(2, { message: "About must be at least 2 characters." }),
  fundingStatusId: z.coerce.number({ required_error: "Please select a funding status." }),
  locationId: z.coerce.number({ required_error: "Please select a location." }),
  programmeOfficerId: z.coerce.number({ required_error: "Please select a programme officer." }),
  developmentStageId: z.coerce.number({ required_error: "Please select a development stage." }),
  amount: z.coerce.number({ required_error: "Please enter an amount." }),
  totalFundingRounds: z.coerce.number({ required_error: "Please enter total funding rounds." }),
  focusAreas: z.array(z.number()).min(1, { message: "Please select at least one focus area." }),
  funds: z.array(z.number()).min(1, { message: "Please select at least one fund." }),
  fundingStart: z.date({ required_error: "Please select a funding start." }).refine(date => date !== undefined, {
    message: "Funding start is required."
  }),
  fundingEnd: z.date({ required_error: "Please select a funding end." }).refine(date => date !== undefined, {
    message: "Funding end is required."
  }),
})

export function FormDialog({ lda, funds, fundingStatuses, locations, focusAreas, developmentStages, programmeOfficers, callback }: FormDialogProps) {
  const [open, setOpen] = useState(false)

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: lda ? lda.name : "",
      about: lda ? lda.about : "",
      amount: lda ? Number(lda.amount) : 0,
      totalFundingRounds: lda ? lda.totalFundingRounds : 0,
      fundingStatusId: lda ? lda.fundingStatusId : fundingStatuses[0].id,
      locationId: lda ? lda.locationId : locations[0].id,
      programmeOfficerId: lda?.programmeOfficerId ?? programmeOfficers[0].id,
      developmentStageId: lda ? lda.developmentStageId : developmentStages[0].id,
      focusAreas: lda ? lda.focusAreas.map((focusArea: FocusArea) => focusArea.id) : [],
      funds: lda ? lda.funds.map((fund: Fund) => fund.id) : [],
      fundingStart: lda ? new Date(lda.fundingStart) : new Date(),
      fundingEnd: lda ? new Date(lda.fundingEnd) : new Date()
    },
  })

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setOpen(false)

    if (lda) {
      toast({
        title: 'Updating LDA...',
        variant: 'processing'
      })
      await fetch(`/api/lda/${lda.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      toast({
        title: 'LDA updated',
        variant: 'success'
      })
    } else {
      toast({
        title: 'Creating LDA...',
        variant: 'processing'
      })
      await fetch(`/api/lda`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      toast({
        title: 'LDA created',
        variant: 'success'
      })
    }

    callback('ldas')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="gap-2 items-center" size="default">
          {lda ? <>
            <SettingsIcon className="h-4 w-4" />
            <span>Manage LDA</span>
          </>
            : <>
              <PlusIcon className="h-4 w-4" />
              <span>Add LDA</span>
            </>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>{lda ? "Edit LDA" : "Create LDA"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-6">
            <Tabs defaultValue="admin" className="w-full">
              <TabsList className="grid w-full grid-cols-5 h-auto p-1 bg-gray-50">
                <TabsTrigger value="admin" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Admin</TabsTrigger>
                <TabsTrigger value="details" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Details</TabsTrigger>
                <TabsTrigger value="operations" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Operations</TabsTrigger>
                <TabsTrigger value="staff" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Staff & Board</TabsTrigger>
                <TabsTrigger value="access" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">User Access</TabsTrigger>
              </TabsList>
              
              <TabsContent value="admin" className="space-y-4 mt-4">
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
                      <FormLabel>About</FormLabel>
                      <FormControl>
                        <Textarea placeholder="LDA about" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex flex-col sm:flex-row gap-4">
                  <FormField
                    control={form.control}
                    name="fundingStatusId"
                    render={({ field }) => (
                      <FormItem className="w-full">
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
                    name="locationId"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Location</FormLabel>
                        <Select value={field.value?.toString()} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {locations.map((location) => (
                              <SelectItem
                                key={location.id}
                                value={location.id.toString()}
                              >
                                {location.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                </div>
              </TabsContent>

              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Funding amount" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="totalFundingRounds"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Total Funding Rounds</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Number of rounds" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <FormField
                    control={form.control}
                    name="focusAreas"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Focus Areas</FormLabel>
                        <InputMultiSelect
                          options={focusAreas.map((focusArea) => ({
                            value: focusArea.id.toString(),
                            label: focusArea.label,
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

                  <FormField
                    control={form.control}
                    name="funds"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Funds</FormLabel>
                        <InputMultiSelect
                          options={funds.map((fund) => ({
                            value: fund.id.toString(),
                            label: fund.name,
                          }))}
                          value={field.value.map(String)}
                          onValueChange={(values: string[]) => field.onChange(values.map(Number))}
                          placeholder="Select funds"
                        >
                          {(provided) => <InputMultiSelectTrigger {...provided} />}
                        </InputMultiSelect>
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="operations" className="space-y-4 mt-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <FormField
                    control={form.control}
                    name="fundingStart"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Funding Start</FormLabel>
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
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                              }
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
                      <FormItem className="w-full">
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
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="developmentStageId"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Development Stage</FormLabel>
                      <Select value={field.value?.toString()} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
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
              </TabsContent>

              <TabsContent value="staff" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="programmeOfficerId"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Programme Officer</FormLabel>
                      <Select value={field.value?.toString()} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
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
              </TabsContent>

              <TabsContent value="access" className="space-y-4 mt-4">
                <div className="text-center py-8 text-gray-500">
                  <p>User access settings will be available here.</p>
                </div>
              </TabsContent>
            </Tabs>
          </form>
        </Form>
        <DialogFooter>
          <Button type="submit" onClick={form.handleSubmit(onSubmit)}>{lda ? "Save changes" : "Create LDA"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog >
  )
}
