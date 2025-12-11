"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

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

import { FocusArea, Province, FundStatus, FundType } from '@prisma/client'
import { FundFull } from '@/types/models'
import { District } from '@/constants/province'

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { CalendarIcon, PlusIcon, Settings } from "lucide-react"
import { useState } from "react"
import { InputMultiSelect, InputMultiSelectTrigger } from "../ui/multiselect";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { format } from "date-fns"
import { Calendar } from "../ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { useEffect, useMemo } from "react"
import dynamic from "next/dynamic"

// Dynamically import Map component
const Map = dynamic(
  () => import("@/components/ldas/map/map"),
  { ssr: false }
)

interface FormDialogProps {
  fund?: FundFull
  focusAreas: FocusArea[]
  provinces: Province[]
  callback: () => void
}

const FormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  about: z.string().min(2, { message: "About must be at least 2 characters." }),
  fundingStatus: z.nativeEnum(FundStatus, { required_error: "Please select a funding status." }),
  fundType: z.nativeEnum(FundType, { required_error: "Please select a fund type." }),
  defaultAmount: z.coerce.number().optional(),
  fundingCalculationType: z.enum(["total_funded_amount", "lda_funding_per_month"]).optional(),
  focusAreas: z.array(z.number()).min(1, { message: "Please select at least one focus area." }),
  fundingStart: z.date({ required_error: "Please select a funding start." }).refine(date => date !== undefined, {
    message: "Funding start is required."
  }),
  fundingEnd: z.date({ required_error: "Please select a funding end." }).refine(date => date !== undefined, {
    message: "Funding end is required."
  }),
  // Organisation detail fields
  contactNumber: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().optional(),
  physicalStreet: z.string().optional(),
  physicalComplexName: z.string().optional(),
  physicalComplexNumber: z.string().optional(),
  physicalCity: z.string().optional(),
  physicalPostalCode: z.string().optional(),
  physicalProvince: z.string().optional(),
  physicalDistrict: z.string().optional(),
  useDifferentPostalAddress: z.boolean(),
  postalStreet: z.string().optional(),
  postalComplexName: z.string().optional(),
  postalComplexNumber: z.string().optional(),
  postalCity: z.string().optional(),
  postalCode: z.string().optional(),
  postalProvince: z.string().optional(),
  postalDistrict: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  mapAddress: z.string().optional(),
})

export function FormDialog({ fund, focusAreas, provinces, callback }: FormDialogProps) {
  const [open, setOpen] = useState(false)

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: fund ? fund.name : "",
      about: fund ? fund.about : "",
      defaultAmount: fund?.defaultAmount ? Number(fund.defaultAmount) : undefined,
      fundingStatus: fund ? fund.fundingStatus : FundStatus.Active,
      fundType: fund ? fund.fundType : FundType.CORE_FUND,
      focusAreas: fund ? fund.focusAreas.map((focusArea: FocusArea) => focusArea.id) : [],
      fundingStart: fund ? new Date(fund.fundingStart) : new Date(),
      fundingEnd: fund ? new Date(fund.fundingEnd) : new Date(),
      fundingCalculationType: "total_funded_amount" as const,
      
      // Organisation detail fields with defaults
      contactNumber: fund?.organisationDetail?.contactNumber || "",
      email: fund?.organisationDetail?.email || "",
      website: fund?.organisationDetail?.website || "",
      physicalStreet: fund?.organisationDetail?.physicalStreet || "",
      physicalComplexName: fund?.organisationDetail?.physicalComplexName || "",
      physicalComplexNumber: fund?.organisationDetail?.physicalComplexNumber || "",
      physicalCity: fund?.organisationDetail?.physicalCity || "",
      physicalPostalCode: fund?.organisationDetail?.physicalPostalCode || "",
      physicalProvince: fund?.organisationDetail?.physicalProvince || "",
      physicalDistrict: fund?.organisationDetail?.physicalDistrict || "",
      useDifferentPostalAddress: fund?.organisationDetail?.useDifferentPostalAddress || false,
      postalStreet: fund?.organisationDetail?.postalStreet || "",
      postalComplexName: fund?.organisationDetail?.postalComplexName || "",
      postalComplexNumber: fund?.organisationDetail?.postalComplexNumber || "",
      postalCity: fund?.organisationDetail?.postalCity || "",
      postalCode: fund?.organisationDetail?.postalCode || "",
      postalProvince: fund?.organisationDetail?.postalProvince || "",
      postalDistrict: fund?.organisationDetail?.postalDistrict || "",
      latitude: fund?.organisationDetail?.latitude || undefined,
      longitude: fund?.organisationDetail?.longitude || undefined,
      mapAddress: fund?.organisationDetail?.mapAddress || "",
    },
  })

  // Watch for form changes to manage districts and map address
  const watchedPhysicalProvince = form.watch('physicalProvince')
  const watchedPostalProvince = form.watch('postalProvince')
  const watchedUseDifferentPostalAddress = form.watch('useDifferentPostalAddress')
  
  // Watch physical address fields for map address and copying to postal
  const watchedPhysicalStreet = form.watch('physicalStreet')
  const watchedPhysicalComplexName = form.watch('physicalComplexName')
  const watchedPhysicalComplexNumber = form.watch('physicalComplexNumber')
  const watchedPhysicalCity = form.watch('physicalCity')
  const watchedPhysicalPostalCode = form.watch('physicalPostalCode')
  const watchedPhysicalDistrict = form.watch('physicalDistrict')

  // Get districts for selected provinces
  const physicalDistricts = useMemo(() => {
    const selectedProvince = provinces.find(p => p.code === watchedPhysicalProvince)
    return (selectedProvince?.districts as unknown as District[]) || []
  }, [provinces, watchedPhysicalProvince])

  const postalDistricts = useMemo(() => {
    const selectedProvince = provinces.find(p => p.code === watchedPostalProvince)
    return (selectedProvince?.districts as unknown as District[]) || []
  }, [provinces, watchedPostalProvince])

  // Compute physical address for map
  const physicalAddress = useMemo(() => {
    const parts = [];
    
    if (watchedPhysicalStreet) parts.push(watchedPhysicalStreet);
    if (watchedPhysicalComplexName) {
      const complex = watchedPhysicalComplexNumber 
        ? `${watchedPhysicalComplexName} ${watchedPhysicalComplexNumber}`
        : watchedPhysicalComplexName;
      parts.push(complex);
    }
    if (watchedPhysicalCity) parts.push(watchedPhysicalCity);
    if (watchedPhysicalDistrict) parts.push(watchedPhysicalDistrict);
    if (watchedPhysicalProvince) parts.push(watchedPhysicalProvince);
    
    if (parts.length > 0) {
      return parts.join(', ') + ', South Africa';
    }
    
    return '';
  }, [
    watchedPhysicalStreet,
    watchedPhysicalComplexName,
    watchedPhysicalComplexNumber,
    watchedPhysicalCity,
    watchedPhysicalDistrict,
    watchedPhysicalProvince
  ]);

  // Reset district when province changes
  useEffect(() => {
    form.setValue('physicalDistrict', '')
  }, [watchedPhysicalProvince, form])

  useEffect(() => {
    form.setValue('postalDistrict', '')
  }, [watchedPostalProvince, form])

  // Auto-update map address when physical address changes
  useEffect(() => {
    if (physicalAddress) {
      form.setValue('mapAddress', physicalAddress);
    }
  }, [physicalAddress, form])

  // Copy physical address to postal address when toggle is off
  useEffect(() => {
    if (!watchedUseDifferentPostalAddress) {
      const physicalStreet = form.getValues('physicalStreet')
      const physicalComplexName = form.getValues('physicalComplexName')
      const physicalComplexNumber = form.getValues('physicalComplexNumber')
      const physicalCity = form.getValues('physicalCity')
      const physicalPostalCode = form.getValues('physicalPostalCode')
      const physicalProvince = form.getValues('physicalProvince')
      const physicalDistrict = form.getValues('physicalDistrict')

      form.setValue('postalStreet', physicalStreet)
      form.setValue('postalComplexName', physicalComplexName)
      form.setValue('postalComplexNumber', physicalComplexNumber)
      form.setValue('postalCity', physicalCity)
      form.setValue('postalCode', physicalPostalCode)
      form.setValue('postalProvince', physicalProvince)
      form.setValue('postalDistrict', physicalDistrict)
    }
  }, [
    watchedUseDifferentPostalAddress, 
    watchedPhysicalStreet,
    watchedPhysicalComplexName,
    watchedPhysicalComplexNumber,
    watchedPhysicalCity,
    watchedPhysicalPostalCode,
    watchedPhysicalProvince,
    watchedPhysicalDistrict,
    form
  ])

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setOpen(false)
    let toastId;

    try {
      if (fund) {
        toastId = toast.loading('Updating fund...')
        const response = await fetch(`/api/fund/${fund?.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to update fund')
        }
        
        toast.dismiss(toastId)
        toast.success('Fund updated successfully')
      } else {
        toastId = toast.loading('Creating fund...')
        const response = await fetch(`/api/fund`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create fund')
        }
        
        toast.dismiss(toastId)
        toast.success('Fund created successfully')
      }
      callback()
    } catch (error) {
      toast.dismiss(toastId)
      toast.error(error instanceof Error ? error.message : 'An unexpected error occurred')
      setOpen(true) // Reopen the dialog to allow corrections
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 items-center" size="default">
          {fund ? <>
              <Settings className="h-4 w-4" />
              <span>Manage fund</span>
            </>
            : <>
              <PlusIcon className="h-4 w-4" />
              <span>Create fund</span>
            </>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl w-full p-0 gap-0 flex flex-col">
        <DialogHeader className="p-5 border-b">
          <DialogTitle>{fund ? "Edit fund" : "Create fund"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
                // Show validation errors in toast
                const errorFields = Object.keys(errors);
                if (errorFields.length > 0) {
                  const errorMessages = errorFields.map(field => {
                    const fieldName = field.replace(/([A-Z])/g, ' $1').toLowerCase();
                    return `${fieldName}: ${errors[field as keyof typeof errors]?.message || 'Invalid value'}`;
                  });
                  toast.error("Please fix the following errors: " + errorMessages.join(", "));
                }
              })} className="flex-grow contents">
            <div className="flex-grow overflow-y-auto">
              <Tabs defaultValue="admin">
                <div className="bg-gray-100 p-2 px-4 sticky top-0 z-10">
                  <div className="max-w-[90vw] overflow-x-auto">
                    <TabsList className="gap-2">
                      <TabsTrigger value="admin" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Admin</TabsTrigger>
                      <TabsTrigger value="details" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Details</TabsTrigger>
                    </TabsList>
                  </div>
                </div>
                
                {/* Scrollable Content Area */}
                <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: 'calc(90vh - 220px)' }}>
                  <TabsContent value="admin">
                    <div className="space-y-4 mt-4">
                      {/* Fund name */}
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fund name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter details here" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {/* Fund description */}
                      <FormField
                        control={form.control}
                        name="about"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fund description</FormLabel>
                            <FormControl>
                              <Textarea rows={5} placeholder="Enter details here" className="resize-none" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {/* Fund focus area */}
                      <FormField
                        control={form.control}
                        name="focusAreas"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fund focus area</FormLabel>
                            <InputMultiSelect
                              options={focusAreas.map(({ id, label }) => ({ value: id.toString(), label }))}
                              value={field.value.map(String)}
                              onValueChange={(values: string[]) => field.onChange(values.map(Number))}
                              placeholder="Select focus areas"
                            >
                              {(provided) => <InputMultiSelectTrigger {...provided} />}
                            </InputMultiSelect>
                          </FormItem>
                        )}
                      />

                      {/* Funding start and end dates */}
                      <div className="flex gap-4">
                        <FormField
                          control={form.control}
                          name="fundingStart"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel>Funding start date</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant={"outline"}
                                      className="w-full pl-3 text-left font-normal"
                                    >
                                      {field.value ? format(field.value, "d MMM, yyyy") : "Pick a date"}
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
                            <FormItem className="flex-1">
                              <FormLabel>Funding end date</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant={"outline"}
                                      className="w-full pl-3 text-left font-normal"
                                    >
                                      {field.value ? format(field.value, "d MMM, yyyy") : "Pick a date"}
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

                      {/* Funding calculation type and Default amount */}
                      <div className="flex gap-4">
                        <FormField
                          control={form.control}
                          name="fundingCalculationType"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel>Funding calculation type</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="total_funded_amount">Total funded amount</SelectItem>
                                  <SelectItem value="lda_funding_per_month">LDA funding per month</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="defaultAmount"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel>Default amount (per LDA)</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="R 0.00" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Fund type */}
                      <FormField
                        control={form.control}
                        name="fundType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fund type</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value={FundType.CORE_FUND}>Core</SelectItem>
                                <SelectItem value={FundType.PROJECT_FUND}>Project</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      {/* Fund status */}
                      <FormField
                        control={form.control}
                        name="fundingStatus"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fund status</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value={FundStatus.Active}>Active</SelectItem>
                                <SelectItem value={FundStatus.Paused}>Paused</SelectItem>
                                <SelectItem value={FundStatus.Cancelled}>Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="details">
                    <div className="space-y-4 mt-4">
                      {/* Contact Details Section */}
                      <div className="space-y-2">
                        <FormField
                          control={form.control}
                          name="contactNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Office contact details</FormLabel>
                              <FormControl>
                                <Input placeholder="Office contact number" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input placeholder="Office contact email" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="website"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input placeholder="Organisation website" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Physical Address Section */}
                      <div className="space-y-2">
                        <FormField
                          control={form.control}
                          name="physicalStreet"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Physical address</FormLabel>
                              <FormControl>
                                <Input placeholder="Street" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="physicalComplexName"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input placeholder="Complex name" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="physicalComplexNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input placeholder="Complex number" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="physicalCity"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input placeholder="City" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="physicalPostalCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input placeholder="Postal code" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        {provinces.length > 0 && (
                          <>
                            <FormField
                              control={form.control}
                              name="physicalProvince"
                              render={({ field }) => (
                                <FormItem>
                                  <Select value={field.value?.toString()} onValueChange={field.onChange}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select province" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {provinces.map((province) => (
                                        <SelectItem key={province.code} value={province.code}>
                                          {province.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="physicalDistrict"
                              render={({ field }) => (
                                <FormItem>
                                  <Select 
                                    value={field.value?.toString()} 
                                    onValueChange={field.onChange}
                                    disabled={!watchedPhysicalProvince}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder={!watchedPhysicalProvince ? "Select province first" : "Select district"} />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {physicalDistricts.map((district: District) => (
                                        <SelectItem key={district.code} value={district.code}>
                                          {district.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                          </>
                        )}
                      </div>

                      {/* Postal Address Toggle */}
                      <FormField
                        control={form.control}
                        name="useDifferentPostalAddress"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="font-normal">Use a different postal address for the organisation</FormLabel>
                          </FormItem>
                        )}
                      />

                      {/* Postal Address Section - Only show if toggle is enabled */}
                      {form.watch('useDifferentPostalAddress') && (
                        <div className="space-y-2">
                          <FormField
                            control={form.control}
                            name="postalStreet"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Postal address</FormLabel>
                                <FormControl>
                                  <Input placeholder="Street" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="postalComplexName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input placeholder="Complex name" {...field} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="postalComplexNumber"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input placeholder="Complex number" {...field} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={form.control}
                            name="postalCity"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input placeholder="City" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          {provinces.length > 0 && (
                            <>
                              <FormField
                                control={form.control}
                                name="postalProvince"
                                render={({ field }) => (
                                  <FormItem>
                                    <Select value={field.value?.toString()} onValueChange={field.onChange}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select province" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {provinces.map((province) => (
                                          <SelectItem key={province.code} value={province.code}>
                                            {province.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="postalDistrict"
                                render={({ field }) => (
                                  <FormItem>
                                    <Select 
                                      value={field.value?.toString()} 
                                      onValueChange={field.onChange}
                                      disabled={!watchedPostalProvince}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder={!watchedPostalProvince ? "Select province first" : "Select district"} />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {postalDistricts.map((district: District) => (
                                          <SelectItem key={district.code} value={district.code}>
                                            {district.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </FormItem>
                                )}
                              />
                            </>
                          )}
                        </div>
                      )}

                      {/* Map Section */}
                      <FormField
                        name="mapAddress"
                        control={form.control}
                        render={() => (
                          <FormItem>
                            <FormLabel>Mapped location</FormLabel>
                            {/* @ts-expect-error - Map component expects LDA form schema but works with any form that has latitude, longitude, and mapAddress fields */}
                            <Map form={form} />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
            <DialogFooter className="flex sm:justify-between flex-col sm:flex-row gap-2 px-4 pb-4 pt-2 border-t mt-auto">
              <Button type="button" onClick={() => setOpen(false)} variant="secondary" className="sm:order-1 order-2">Cancel</Button>
              <Button type="submit" className="sm:order-2 order-1">{fund ? "Update fund" : "Create fund"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog >
  )
}
