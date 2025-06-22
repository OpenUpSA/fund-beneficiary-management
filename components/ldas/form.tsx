"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

// Import the form schema
import { FormSchema, FormValues } from "./manage-lda/form-schema"

import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
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
import { PlusIcon, SettingsIcon } from "lucide-react"
import { useState } from "react"
import { FundFull } from "@/types/models";

// Import tab components
import { AdminTab } from "./manage-lda/admin"
import { DetailsTab } from "./manage-lda/details"
import { OperationsTab } from "./manage-lda/operations"
import { StaffTab } from "./manage-lda/staff"
import { AccessTab } from "./manage-lda/access"

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

// FormSchema is now imported from form-schema.ts

export function FormDialog({ lda, funds, fundingStatuses, locations, focusAreas, developmentStages, programmeOfficers, callback }: FormDialogProps) {
  const [open, setOpen] = useState(false)

  const form = useForm<FormValues>({
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

  async function onSubmit(data: FormValues) {
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
      <DialogContent className="max-h-[90vh] max-w-2xl w-full p-0 gap-0">
        {/* Fixed Header */}
        <DialogHeader className="p-5">
          <DialogTitle>{lda ? "Manage LDA" : "Create LDA"}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form className="h-full">
            {/* Fixed Tabs Navigation */}
            <div>
              <Tabs defaultValue="admin">
                <div className="bg-gray-100 p-2 px-4">
                  <div className="max-w-[90vw] overflow-x-auto">
                    <TabsList className="gap-2">
                      <TabsTrigger value="admin" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Admin</TabsTrigger>
                      <TabsTrigger value="details" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Details</TabsTrigger>
                      <TabsTrigger value="operations" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Operations</TabsTrigger>
                    <TabsTrigger value="staff" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Staff & Board</TabsTrigger>
                    <TabsTrigger value="access" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">User Access</TabsTrigger>
                  </TabsList>
                </div>
                </div>
                
                {/* Scrollable Content Area */}
                <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: 'calc(90vh - 220px)' }}>
                  <TabsContent value="admin">
                    <AdminTab 
                      form={form} 
                      fundingStatuses={fundingStatuses} 
                      locations={locations} 
                      focusAreas={focusAreas} 
                      developmentStages={developmentStages} 
                      programmeOfficers={programmeOfficers} 
                    />
                  </TabsContent>

                  <TabsContent value="details">
                    <DetailsTab 
                      form={form} 
                      funds={funds} 
                    />
                  </TabsContent>

                  <TabsContent value="operations">
                    <OperationsTab 
                      form={form} 
                      locations={locations} 
                    />
                  </TabsContent>

                  <TabsContent value="staff">
                    <StaffTab />
                  </TabsContent>

                  <TabsContent value="access">
                    <AccessTab />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </form>
        </Form>
        <DialogFooter className="flex sm:justify-between flex-col sm:flex-row gap-2 px-4 pb-4 pt-2 border-t mt-auto">
          <Button type="button" onClick={() => setOpen(false)} variant="secondary" className="sm:order-1 order-2">Cancel</Button>
          <Button type="submit" onClick={form.handleSubmit(onSubmit)} className="sm:order-2 order-1">{lda ? "Save and close" : "Create LDA"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
