
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { InfoIcon } from "lucide-react";
import { Contact } from "@prisma/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { FormDialog as ContactFormDialog } from "@/components/contacts/form"
import { revalidateTag } from "next/cache";

interface Props {
  contacts: Contact[]
}

const dataChanged = async () => {
  "use server"
  revalidateTag('ldas')
}


export const Contacts = ({ contacts }: Props) => {
  return (

    <Table className="text-xs w-full">
      <TableHeader>
        <TableRow>
          <TableHead className="w-full">Name</TableHead>
          <TableHead>Position</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>
            <InfoIcon size={10} />
          </TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contacts.map((contact) => (
          <TableRow key={contact.id}>
            <TableCell>
              {contact.name}
            </TableCell>
            <TableCell className="text-nowrap">{contact.position}</TableCell>
            <TableCell className="text-nowrap">{contact.contactNumber}</TableCell>
            <TableCell className="text-nowrap">{contact.email}</TableCell>
            <TableCell>
              {contact.info && <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger><InfoIcon size={10} /></TooltipTrigger>
                  <TooltipContent className="max-w-[20rem]">
                    {contact.info}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>}
            </TableCell>
            <TableCell>
              <ContactFormDialog
                key={contact.id}
                contact={contact}
                callback={dataChanged} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}