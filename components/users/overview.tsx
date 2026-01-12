"use client"

import { format } from "date-fns"
import { Badge } from "../ui/badge"
import { Card, CardContent } from "../ui/card"
import { UserFull } from "@/types/models"
import { useTranslations } from "next-intl"
import { LDA_TERMINOLOGY } from "@/constants/lda"

interface Props {
  user: UserFull
}

export const Overview: React.FC<Props> = ({ user }: Props) => {
  const tC = useTranslations('common')

  return (
    <div className="space-y-4">
      <div className="sm:flex gap-4 ">
        <Card className="w-full sm:w-[0.5]">
          <CardContent className="pt-2 space-y-2 text-sm py-4">
            <div className="flex justify-between">
              <span className="font-medium">Name:</span>
              <span>{user.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Email:</span>
              <span>{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Approved:</span>
              <Badge variant={user.approved ? 'default' : 'destructive'}>{user.approved ? 'Yes' : 'No'}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Role:</span>
              <Badge variant="outline">{user.role === 'USER' ? LDA_TERMINOLOGY.userRole : tC(`roles.${user.role}`)}</Badge>
            </div>
            {user.localDevelopmentAgencies && user.localDevelopmentAgencies.length > 0 && (
              <div className="flex justify-between">
                <span className="font-medium">{LDA_TERMINOLOGY.shortName}:</span>
                <Badge variant="outline">{user.localDevelopmentAgencies?.map((lda) => lda.name).join(', ')}</Badge>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="w-full">
          <CardContent className="pt-2 space-y-2 text-sm py-4">
            <div className="flex justify-between">
              <span className="font-medium">Created At:</span>
              <span>{format(user.createdAt, 'PPpp')}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Updated At:</span>
              <span>{format(user.updatedAt, 'PPpp')}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}