"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { toast } from "sonner"
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

import { FocusArea, Province, FundStatus } from '@prisma/client'
import { FunderFull } from '@/types/models'
import { District } from '@/constants/province'

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { PencilIcon, PlusIcon } from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { InputMultiSelect, InputMultiSelectTrigger } from "../ui/multiselect";
import { Switch } from "@/components/ui/switch"
import dynamic from "next/dynamic"

// Dynamically import Map component
const Map = dynamic(
  () => import("@/components/ldas/map/map"),
  { ssr: false }
)

const FormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  about: z.string(),
  fundingStatus: z.nativeEnum(FundStatus, { required_error: "Please select a funding status." }),
  amount: z.number(),
  focusAreas: z.array(z.number()),
  fundingStart: z.date(),
  fundingEnd: z.date(),
  
  // Organisation detail fields
  contactNumber: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  
  // Physical address
  physicalStreet: z.string().optional(),
  physicalComplexName: z.string().optional(),
  physicalComplexNumber: z.string().optional(),
  physicalCity: z.string().optional(),
  physicalPostalCode: z.string().optional(),
  physicalProvince: z.string().optional(),
  physicalDistrict: z.string().optional(),
  
  // Postal address
  useDifferentPostalAddress: z.boolean(),
  postalStreet: z.string().optional(),
  postalComplexName: z.string().optional(),
  postalComplexNumber: z.string().optional(),
  postalCity: z.string().optional(),
  postalCode: z.string().optional(),
  postalProvince: z.string().optional(),
  postalDistrict: z.string().optional(),
  
  // Mapped location
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  mapAddress: z.string().optional(),
})

interface FormDialogProps {
  funder?: FunderFull
  focusAreas: FocusArea[]
  provinces: Province[]
  callback: () => void
}


export function FormDialog({ funder, focusAreas, provinces, callback }: FormDialogProps) {
  const [open, setOpen] = useState(false)

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: funder ? funder.name : "",
      about: funder ? funder.about : "",
      fundingStatus: funder ? funder.fundingStatus : FundStatus.Active,
      amount: funder ? Number(funder.amount) : 0,
      focusAreas: funder ? funder.focusAreas.map((focusArea: FocusArea) => focusArea.id) : [],
      fundingStart: funder ? new Date(funder.fundingStart) : new Date(),
      fundingEnd: funder ? new Date(funder.fundingEnd) : new Date(),
      
      // Organisation detail fields with defaults
      contactNumber: funder?.organisationDetail?.contactNumber || "",
      email: funder?.organisationDetail?.email || "",
      website: funder?.organisationDetail?.website || "",
      
      // Physical address
      physicalStreet: funder?.organisationDetail?.physicalStreet || "",
      physicalComplexName: funder?.organisationDetail?.physicalComplexName || "",
      physicalComplexNumber: funder?.organisationDetail?.physicalComplexNumber || "",
      physicalCity: funder?.organisationDetail?.physicalCity || "",
      physicalPostalCode: funder?.organisationDetail?.physicalPostalCode || "",
      physicalProvince: funder?.organisationDetail?.physicalProvince || "",
      physicalDistrict: funder?.organisationDetail?.physicalDistrict || "",
      
      // Postal address
      useDifferentPostalAddress: funder?.organisationDetail?.useDifferentPostalAddress || false,
      postalStreet: funder?.organisationDetail?.postalStreet || "",
      postalComplexName: funder?.organisationDetail?.postalComplexName || "",
      postalComplexNumber: funder?.organisationDetail?.postalComplexNumber || "",
      postalCity: funder?.organisationDetail?.postalCity || "",
      postalCode: funder?.organisationDetail?.postalCode || "",
      postalProvince: funder?.organisationDetail?.postalProvince || "",
      postalDistrict: funder?.organisationDetail?.postalDistrict || "",
      
      // Mapped location
      latitude: funder?.organisationDetail?.latitude || undefined,
      longitude: funder?.organisationDetail?.longitude || undefined,
      mapAddress: funder?.organisationDetail?.mapAddress || "",
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
      if (funder) {
        toastId = toast.loading('Updating funder...')
        const response = await fetch(`/api/funder/${funder?.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to update funder')
        }
        
        toast.dismiss(toastId)
        toast.success('Funder updated successfully')
      } else {
        toastId = toast.loading('Creating funder...')
        const response = await fetch(`/api/funder/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create funder')
        }

        toast.dismiss(toastId)
        toast.success('Funder created successfully')
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
          {funder ? <>
              <PencilIcon className="h-4 w-4" />
              <span>Edit Funder</span>
            </>
            : <>
              <PlusIcon className="h-4 w-4" />
              <span>Add Funder</span>
            </>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl w-full p-0 gap-0 flex flex-col">
        <DialogHeader className="p-5 border-b">
          <DialogTitle>{funder ? "Edit funder" : "Add funder"}</DialogTitle>
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
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Funder name</FormLabel>
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
                            <FormLabel>Funder description</FormLabel>
                            <FormControl>
                              <Textarea rows={5} placeholder="Enter details here" className="resize-none" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="focusAreas"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Funder focus areas</FormLabel>
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

                      <FormField
                        control={form.control}
                        name="fundingStatus"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Funder status</FormLabel>
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
                        )} />
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

                      {/* Mapped Location */}
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
              <Button type="submit" className="sm:order-2 order-1">{funder ? "Update Funder" : "Create Funder"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
