"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

// Import the form schema
import { FormSchema, FormValues } from "./manage-lda/form-schema"

import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { FocusArea, DevelopmentStage } from '@prisma/client'
import { UserWithLDAsBasic } from '@/types/models'
import { LocalDevelopmentAgencyFull, Province } from '@/types/models'
import { usePermissions } from '@/hooks/use-permissions'

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { PlusIcon, SettingsIcon } from "lucide-react"
import { useState, useCallback } from "react"


// Import tab components
import { AdminTab } from "./manage-lda/admin"
import { DetailsTab } from "./manage-lda/details"
import { OperationsTab } from "./manage-lda/operations"
import { StaffTab } from "./manage-lda/staff"
import { AccessTab } from "./manage-lda/access"


interface FormDialogProps {
  lda?: LocalDevelopmentAgencyFull
  focusAreas: FocusArea[]
  developmentStages: DevelopmentStage[]
  programmeOfficers: UserWithLDAsBasic[]
  provinces: Province[]
  callback: (ldaId?: number) => void
}

// FormSchema is now imported from form-schema.ts

export function FormDialog({ lda, focusAreas, developmentStages, programmeOfficers, provinces, callback }: FormDialogProps) {
  const [open, setOpen] = useState(false);

  console.log("lda", lda)
  const { canCreateLDA, canManageLDA } = usePermissions()
  
  const [operationsData, setOperationsData] = useState(
    {
      vision: { 
        value: lda?.operations?.vision ?? '',
        originalValue: lda?.operations?.vision ?? '',
        edited: false
      },
      mission: { 
        value: lda?.operations?.mission ?? '',
        originalValue: lda?.operations?.mission ?? '',
        edited: false
      },
      objectives: { 
        value: lda?.operations?.objectives ?? '',
        originalValue: lda?.operations?.objectives ?? '',
        edited: false
      },
      programmaticAreas: { 
        value: lda?.operations?.programmaticAreas ?? '',
        originalValue: lda?.operations?.programmaticAreas ?? '',
        edited: false
      },
      climateFocus: { 
        value: lda?.operations?.climateFocus ?? '',
        originalValue: lda?.operations?.climateFocus ?? '',
        edited: false
      },
      youthFocus: { 
        value: lda?.operations?.youthFocus ?? '',
        originalValue: lda?.operations?.youthFocus ?? '',
        edited: false
      },
      genderFocus: { 
        value: lda?.operations?.genderFocus ?? '',
        originalValue: lda?.operations?.genderFocus ?? '',
        edited: false
      },
      fundraisingStrategies: { 
        value: lda?.operations?.fundraisingStrategies ?? '',
        originalValue: lda?.operations?.fundraisingStrategies ?? '',
        edited: false
      },
      partnershipsWithinOutside: { 
        value: lda?.operations?.partnershipsWithinOutside ?? '',
        originalValue: lda?.operations?.partnershipsWithinOutside ?? '',
        edited: false
      },
      ensureOrgNotReliantOnScatOnly: { 
        value: lda?.operations?.ensureOrgNotReliantOnScatOnly ?? '',
        originalValue: lda?.operations?.ensureOrgNotReliantOnScatOnly ?? '',
        edited: false
      },
      nationalAdvocacyStrategies: { 
        value: lda?.operations?.nationalAdvocacyStrategies ?? '',
        originalValue: lda?.operations?.nationalAdvocacyStrategies ?? '',
        edited: false
      },
      monitoringAndLearning: { 
        value: lda?.operations?.monitoringAndLearning ?? '',
        originalValue: lda?.operations?.monitoringAndLearning ?? '',
        edited: false
      },
    }
  );

  async function handleOperationSave(field: string, value: string) {
    if (!lda) return;

    const currentOperations = operationsData;
    const updatedOperations = { ...operationsData, [field]: { 
      value,
      originalValue: value,
      edited: false 
    } };
    setOperationsData(updatedOperations);

    const toastId = toast.loading(`Saving organisation operations info...`);
    try {
      const response = await fetch(`/api/lda/${lda.id}/operations`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to save ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
      }
      callback(lda.id);
      toast.dismiss(toastId);
      toast.success(`Organisation operations info saved successfully`);
    } catch (error) {
      console.error(`Error saving ${field}:`, error);
      toast.dismiss(toastId);
      toast.error(error instanceof Error ? error.message : `Failed to save ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
      setOperationsData(currentOperations);
    }
  }

  const handleOperationChange = useCallback((fieldName: string, value: string, isEdited: boolean) => {
    setOperationsData(prevData => ({
      ...prevData,
      [fieldName]: {
        ...(prevData[fieldName as keyof typeof prevData] || {}),
        value,
        edited: isEdited,
      },
    }));
  }, [setOperationsData]);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: lda ? lda.name : '',
      about: lda ? lda.about : '',
      registrationStatus: lda?.registrationStatus ?? 'not_registered', 
      registrationCode: lda?.registrationCode ?? '',
      registrationDate: lda?.registrationDate ? new Date(lda.registrationDate) : undefined,
      focusAreas: lda ? lda.focusAreas.map(fa => fa.id) : [],
      developmentStageId: lda?.developmentStageId?.toString() ?? undefined,
      programmeOfficerId: lda?.programmeOfficerId?.toString() ?? undefined,
      organisationStatus: lda?.organisationStatus ?? 'active',
      contactNumber: lda?.organisationDetail?.contactNumber ?? '',
      email: lda?.organisationDetail?.email ?? '',
      website: lda?.organisationDetail?.website ?? '',
      physicalStreet: lda?.organisationDetail?.physicalStreet ?? '',
      physicalComplexName: lda?.organisationDetail?.physicalComplexName ?? '',
      physicalComplexNumber: lda?.organisationDetail?.physicalComplexNumber ?? '',
      physicalCity: lda?.organisationDetail?.physicalCity ?? '',
      physicalPostalCode: lda?.organisationDetail?.physicalPostalCode ?? '',
      physicalProvince: lda?.organisationDetail?.physicalProvince ?? '',
      physicalDistrict: lda?.organisationDetail?.physicalDistrict ?? '',
      useDifferentPostalAddress: lda?.organisationDetail?.useDifferentPostalAddress ?? false,
      postalStreet: lda?.organisationDetail?.postalStreet ?? '',
      postalComplexName: lda?.organisationDetail?.postalComplexName ?? '',
      postalComplexNumber: lda?.organisationDetail?.postalComplexNumber ?? '',
      postalCity: lda?.organisationDetail?.postalCity ?? '',
      postalCode: lda?.organisationDetail?.postalCode ?? '',
      postalProvince: lda?.organisationDetail?.postalProvince ?? '',
      postalDistrict: lda?.organisationDetail?.postalDistrict ?? '',
      latitude: lda?.organisationDetail?.latitude ?? 0,
      longitude: lda?.organisationDetail?.longitude ?? 0,
      mapAddress: lda?.organisationDetail?.mapAddress ?? '',
    },
  })

  async function onSubmit(data: FormValues) {
    setOpen(false)
    let toastId;

    try {
      if (lda) {
        toastId = toast.loading('Updating LDA...')
        const response = await fetch(`/api/lda/${lda.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to update LDA')
        }
        
        toast.dismiss(toastId)
        toast.success('LDA updated successfully')
        callback(lda.id)
      } else {
        toastId = toast.loading('Creating new LDA...')
        const response = await fetch(`/api/lda`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create LDA')
        }

        toast.dismiss(toastId)
        toast.success('LDA created successfully')
        callback()
      }
      
    } catch (error) {
      toast.dismiss(toastId)
      toast.error(error instanceof Error ? error.message : 'An unexpected error occurred')
      setOpen(true) // Reopen the dialog to allow corrections
    }
  }

  // Permission checks
  if (!lda && !canCreateLDA()) {
    // Hide Add LDA button if user can't create LDAs (only SuperUsers can create)
    return null
  }

  if (lda && !canManageLDA(lda.id)) {
    // Hide Manage LDA button if user doesn't have permission to manage this specific LDA
    return null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 items-center" size="default">
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
      <DialogContent className="max-h-[90vh] max-w-2xl w-full p-0 gap-0 flex flex-col">
        <DialogHeader className="p-5 border-b">
          <DialogTitle>{lda ? "Manage LDA" : "Create LDA"}</DialogTitle>
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
                  toast.error(
                    <div>
                      <p className="font-semibold mb-1">Please fix the following errors:</p>
                      <ul className="list-disc pl-4">
                        {errorMessages.map((msg, i) => <li key={i}>{msg}</li>)}
                      </ul>
                    </div>
                  );
                }
              })} className="flex-grow contents">
            <div className="flex-grow overflow-y-auto">
              <Tabs defaultValue="admin">
                <div className="bg-gray-100 p-2 px-4 sticky top-0 z-10">
                  <div className="max-w-[90vw] overflow-x-auto">
                    <TabsList className="gap-2">
                      <TabsTrigger value="admin" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Admin</TabsTrigger>
                      <TabsTrigger value="details" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Details</TabsTrigger>
                      {lda && <TabsTrigger value="operations" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Operations</TabsTrigger>}
                      {lda && <TabsTrigger value="staff" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Staff & Board</TabsTrigger>}
                      {lda && <TabsTrigger value="access" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">User Access</TabsTrigger>}
                    </TabsList>
                  </div>
                </div>
                
                {/* Scrollable Content Area */}
                <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: 'calc(90vh - 220px)' }}>
                  <TabsContent value="admin">
                    <AdminTab 
                      form={form}
                      focusAreas={focusAreas}
                      developmentStages={developmentStages}
                      programmeOfficers={programmeOfficers}
                    />
                  </TabsContent>
                  <TabsContent value="details">
                    <DetailsTab 
                      form={form} 
                      provinces={provinces} 
                    />
                  </TabsContent>
                  {lda && (
                    <>
                      <TabsContent value="operations">
                        <OperationsTab
                          operationsData={operationsData}
                          onSave={handleOperationSave}
                          onChange={handleOperationChange}
                        />
                      </TabsContent>
                      <TabsContent value="staff">
                        <StaffTab staffMembers={lda.staffMembers ?? []} ldaId={lda.id} callback={callback}/>
                      </TabsContent>
                      <TabsContent value="access">
                        <AccessTab userAccess={lda.userAccess ?? []} ldaId={lda.id} callback={callback}/>
                      </TabsContent>
                    </>
                  )}
                </div>
              </Tabs>
            </div>
            <DialogFooter className="flex sm:justify-between flex-col sm:flex-row gap-2 px-4 pb-4 pt-2 border-t mt-auto">
              <Button type="button" onClick={() => setOpen(false)} variant="secondary" className="sm:order-1 order-2">Cancel</Button>
              <Button type="submit" className="sm:order-2 order-1">{lda ? "Save and close" : "Create LDA"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
