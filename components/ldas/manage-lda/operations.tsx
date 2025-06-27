import { 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel 
} from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Location } from "@prisma/client"
import { UseFormReturn } from "react-hook-form"
import { FormValues } from "./form-schema"

interface OperationsTabProps {
  form: UseFormReturn<FormValues>
  locations: Location[]
}

import { InlineEditableField } from "@/components/ui/inline-editable-field";
import { useState } from "react";

export function OperationsTab({ form, locations }: OperationsTabProps) {
  // Example: You would get these from form state or props
  const [vision, setVision] = useState(
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent varius velit sodales, sollicitudin ipsum in, mollis ligula. Vestibulum efficitur odio quam. In hac habitasse platea dictumst. Aenean aliquam justo et dui varius, ac consequat felis vehicula. Vestibulum vestibulum rutrum ligula et volutpat. Integer efficitur ullamcorper elit, in viverra ante ornare vitae. Praesent metus dui, volutpat eget elit vulputate, pellentesque interdum libero. Nullam scelerisque nulla nisl, sit amet rhoncus erat gravida at."
  );
  const [mission, setMission] = useState(
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent varius velit sodales, sollicitudin ipsum in, mollis ligula. Vestibulum efficitur odio quam. In hac habitasse platea dictumst. Aenean aliquam justo et dui varius"
  );

  // Example PUT request handler
  async function handleSave(field: "vision" | "mission", value: string) {
    // Replace with your actual endpoint and payload structure
    await fetch(`/api/lda/organisation`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (field === "vision") setVision(value);
    if (field === "mission") setMission(value);
  }

  return (
    <div className="space-y-8 mt-4">
      <h2 className="text-2xl font-bold mb-6">Vision & Mission</h2>
      <InlineEditableField
        label="Vision of organisation"
        value={vision}
        fieldName="vision"
        multiline
        onSave={value => handleSave("vision", value)}
      />
      <InlineEditableField
        label="Mission of organisation"
        value={mission}
        fieldName="mission"
        multiline
        onSave={value => handleSave("mission", value)}
      />
    </div>
  );
}

