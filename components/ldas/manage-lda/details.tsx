import { 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel 
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { InputMultiSelect, InputMultiSelectTrigger } from "@/components/ui/multiselect"
import { FundFull } from "@/types/models"
import { UseFormReturn } from "react-hook-form"
import { FormValues } from "./form-schema"

interface DetailsTabProps {
  form: UseFormReturn<FormValues>
  funds: FundFull[]
}

export function DetailsTab({ form, funds }: DetailsTabProps) {
  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Funding Amount</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="totalFundingRounds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total Funding Rounds</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="funds"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Associated Funds</FormLabel>
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
  )
}
