import { 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel,
  FormDescription
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { FundFull } from "@/types/models"
import { UseFormReturn } from "react-hook-form"
import { FormValues } from "./form-schema"
import { Province } from "@/types/models"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useState, useEffect } from "react"
import Map from "@/components/map";

interface DetailsTabProps {
  form: UseFormReturn<FormValues>
  funds: FundFull[],
  provinces: Province[]
}

interface District {
  name: string;
  code: string;
}

export function DetailsTab({ form, funds, provinces }: DetailsTabProps) {
  // State to store districts based on selected province
  const [districts, setDistricts] = useState<District[]>([]);
  const [postalDistricts, setPostalDistricts] = useState<District[]>([]);
  
  // Watch for changes to the physicalProvince field
  const selectedPhysicalStreet = form.watch('physicalStreet');
  const selectedPhysicalComplexName = form.watch('physicalComplexName');
  const selectedPhysicalComplexNumber = form.watch('physicalComplexNumber');
  const selectedPhysicalCity = form.watch('physicalCity');
  const selectedPhysicalProvinceCode = form.watch('physicalProvince');
  const selectedPhysicalDistrictCode = form.watch('physicalDistrict');
  const selectedPostalProvinceCode = form.watch('postalProvince');
  const useDifferentPostalAddress = form.watch('useDifferentPostalAddress');
  
  // Update districts when province changes
  useEffect(() => {
    // Reset district when province changes
    form.setValue('physicalDistrict', '');
    form.setValue('postalDistrict', '');
    
    if (selectedPhysicalProvinceCode) {
      // Find the selected province and get its districts
      const selectedProvince = provinces.find(p => p.code === selectedPhysicalProvinceCode);
      if (selectedProvince && selectedProvince.districts) {
        setDistricts(selectedProvince.districts);
      } else {
        setDistricts([]);
      }
    } else {
      // Clear districts when no province is selected
      setDistricts([]);
    }

    if (selectedPostalProvinceCode) {
      // Find the selected province and get its districts
      const selectedProvince = provinces.find(p => p.code === selectedPostalProvinceCode);
      if (selectedProvince && selectedProvince.districts) {
        setPostalDistricts(selectedProvince.districts);
      } else {
        setPostalDistricts([]);
      }
    } else {
      // Clear districts when no province is selected
      setPostalDistricts([]);
    }

    if (!useDifferentPostalAddress) {
      form.setValue('postalStreet', form.getValues('physicalStreet'));
      form.setValue('postalComplexName', form.getValues('physicalComplexName'));
      form.setValue('postalComplexNumber', form.getValues('physicalComplexNumber'));
      form.setValue('postalCity', form.getValues('physicalCity'));
      form.setValue('postalProvince', selectedPhysicalProvinceCode);
      form.setValue('postalDistrict', selectedPhysicalDistrictCode);
    }
  }, [
    selectedPhysicalProvinceCode,
    selectedPostalProvinceCode,
    selectedPhysicalStreet,
    selectedPhysicalComplexName,
    selectedPhysicalComplexNumber,
    selectedPhysicalCity,
    selectedPhysicalProvinceCode,
    selectedPhysicalDistrictCode,
    provinces,
    form
]);

  return (
    <div className="space-y-4 mt-4">

      <div className="space-y-2">
        <FormField
          control={form.control}
          name="officeContactNumber"
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
            name="officeEmail"
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
            name="organisationWebsite"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="Oganisation website" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
      </div>
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
          )} />

          <FormField
              control={form.control}
              name="physicalComplexNumber"
              render={({ field }) => (
              <FormItem>
                  <FormControl>
                      <Input placeholder="Complex number" {...field} />
                  </FormControl>
              </FormItem>
          )} />
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
          )} />

          <FormField
              control={form.control}
              name="physicalPostalCode"
              render={({ field }) => (
              <FormItem>
                  <FormControl>
                      <Input placeholder="Postal code" {...field} />
                  </FormControl>
              </FormItem>
          )} />
        </div>
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
                    <SelectItem
                        key={province.code}
                        value={province.code}
                    >
                        {province.name}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </FormItem>
          )} />
          
          <FormField
            control={form.control}
            name="physicalDistrict"
            render={({ field }) => (
            <FormItem>
              <Select value={field.value?.toString()} onValueChange={field.onChange} disabled={districts.length === 0}>
                <FormControl>
                    <SelectTrigger>
                  <SelectValue placeholder="Select district" />
                    </SelectTrigger>
                </FormControl>
                <SelectContent>
                    {districts.map((district) => (
                    <SelectItem
                        key={district.code}
                        value={district.code}
                    >
                        {district.name}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </FormItem>
          )} />
      </div>

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
      )} />

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
          )} />

          <FormField
              control={form.control}
              name="postalComplexNumber"
              render={({ field }) => (
              <FormItem>
                  <FormControl>
                      <Input placeholder="Complex number" {...field} />
                  </FormControl>
              </FormItem>
          )} />
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
          )} />
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
                    <SelectItem
                        key={province.code}
                        value={province.code}
                    >
                        {province.name}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </FormItem>
          )} />
          
          <FormField
            control={form.control}
            name="postalDistrict"
            render={({ field }) => (
            <FormItem>
              <Select value={field.value?.toString()} onValueChange={field.onChange} disabled={districts.length === 0}>
                <FormControl>
                    <SelectTrigger>
                  <SelectValue placeholder="Select district" />
                    </SelectTrigger>
                </FormControl>
                <SelectContent>
                    {postalDistricts.map((district) => (
                    <SelectItem
                        key={district.code}
                        value={district.code}
                    >
                        {district.name}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </FormItem>
          )} />
      </div>
      <div className="mt-6">
        <h3 className="text-lg font-medium mb-2">Location on Map</h3>
        <p className="text-sm text-muted-foreground mb-4">Click on the map to set the location or search for an address</p>
        <Map />
      </div>
    </div>
  )
}
