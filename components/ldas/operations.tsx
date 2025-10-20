"use client"

import { LocalDevelopmentAgencyFull } from "@/types/models"


interface OperationsViewProps {
  lda: LocalDevelopmentAgencyFull
}

export function OperationsView({ lda }: OperationsViewProps) {
  const staffMembers = lda.staffMembers || []
  const boardMembers = staffMembers.filter(member => member.isCommittee)
  const regularStaff = staffMembers.filter(member => !member.isCommittee)

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Operational Information</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="bg-white lg:col-span-5">
            <div className="border border-slate-300 rounded-lg p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-[18px]">Staff & Board</h3>
            </div>
            <div className="space-y-4">
              {/* Staff Members */}
              <div className="space-y-4">
                <h4 className="font-medium text-[14px] mb-2 text-slate-900">Staff members ({regularStaff.length})</h4>
                <div className="space-y-2">
                  {regularStaff.map((member) => (
                    <div key={member.id} className="flex justify-between items-center text-sm text-slate-700 space-y-1">
                      <span>{member.firstName} {member.lastName}</span>
                      <span>{member.position}</span>
                    </div>
                  ))}
                  {regularStaff.length === 0 && (
                    <p className="text-gray-500 text-sm">No staff members added yet.</p>
                  )}
                </div>
              </div>

              {/* Board Members */}
              <div  className="space-y-4">
                <h4 className="font-medium text-[14px] mb-2 text-slate-900">Board members ({boardMembers.length})</h4>
                <div className="space-y-2">
                  {boardMembers.map((member) => (
                    <div key={member.id} className="flex justify-between items-center text-sm">
                      <span className="text-slate-700">{member.firstName} {member.lastName}</span>
                      <span className="text-slate-700">{member.position}</span>
                    </div>
                  ))}
                  {boardMembers.length === 0 && (
                    <p className="text-gray-500 text-sm">No board members added yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-300 rounded-lg p-6 lg:col-span-7 overflow-y-auto h-[70vh] min-h-[400px]">
          <div>
            <div className="space-y-4 pb-6">
              <div className="mb-4">
                <h3 className="font-semibold text-[18px]">Vision & Mission</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-[14px] mb-2 text-slate-900">Vision of organisation</h4>
                  <p className="font-normal text-[14px] text-slate-500">
                    {lda.operations?.vision || "Information not provided."}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-[14px] mb-2 text-slate-900">Mission of organisation</h4>
                  <p className="font-normal text-[14px] text-slate-500">
                    {lda.operations?.mission || "Information not provided."}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-4 border-t border-slate-300 py-6">
              <div className="mb-4">
                <h3 className="font-semibold text-[18px]">Objectives & Activities</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-[14px] mb-2 text-slate-900">Main objectives of organisation</h4>
                  <p className="font-normal text-[14px] text-slate-500">
                  {lda.operations?.objectives || "Information not provided."}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-[14px] mb-2 text-slate-900">Main programmatic areas</h4>
                  <p className="font-normal text-[14px] text-slate-500">
                  {lda.operations?.programmaticAreas || "Information not provided."}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 border-t border-slate-300 py-6">
              <div className="mb-4">
                <h3 className="font-semibold text-[18px]">Focus Areas</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-[14px] mb-2 text-slate-900">How does the organisation contribute to climate</h4>
                  <p className="font-normal text-[14px] text-slate-500">
                  {lda.operations?.climateFocus || "Information not provided."}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-[14px] mb-2 text-slate-900">How does the organisation contribute to youth</h4>
                  <p className="font-normal text-[14px] text-slate-500">
                  {lda.operations?.youthFocus || "Information not provided."}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-[14px] mb-2 text-slate-900">How does the organisation contribute to gender</h4>
                  <p className="font-normal text-[14px] text-slate-500">
                  {lda.operations?.genderFocus || "Information not provided."}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 border-t border-slate-300 py-6">
              <div className="mb-4">
                <h3 className="font-semibold text-[18px]">Sustainability</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-[14px] mb-2 text-slate-900">What are the local and other fundraising strategies the LDA is implementing to raise funding?</h4>
                  <p className="font-normal text-[14px] text-slate-500">
                  {lda.operations?.fundraisingStrategies || "Information not provided."}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-[14px] mb-2 text-slate-900">What are you doing to ensure that your organisation is not reliant on SCAT only for funding?</h4>
                  <p className="font-normal text-[14px] text-slate-500">
                  {lda.operations?.ensureOrgNotReliantOnScatOnly || "Information not provided."}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 border-t border-slate-300 py-6">
              <div className="mb-4">
                <h3 className="font-semibold text-[18px]">Partnerships & Networks</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-[14px] mb-2 text-slate-900">Who do you work with within and outside your community? (E.g. CBO partners, key stakeholders, traditional leadership, etc.)</h4>
                  <p className="font-normal text-[14px] text-slate-500">
                  {lda.operations?.partnershipsWithinOutside || "Information not provided."}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-[14px] mb-2 text-slate-900">Are you connected to any national advocacy strategies or campaigns? If yes, please provide details</h4>
                  <p className="font-normal text-[14px] text-slate-500">
                  {lda.operations?.nationalAdvocacyStrategies || "Information not provided."}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 border-t border-slate-300 pt-6">
              <div className="mb-4">
                <h3 className="font-semibold text-[18px]">Monitoring & Learning</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-[14px] mb-2 text-slate-900">What processes do you use in your organisation to monitor your progress and learn from your experiences? (EG, planning, reviewing of organisational plans, etc.)</h4>
                  <p className="font-normal text-[14px] text-slate-500">
                  {lda.operations?.monitoringAndLearning || "Information not provided."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
