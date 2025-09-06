"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Loader2, PencilIcon, PlusIcon } from "lucide-react"
import { useState } from "react"
import { LocalDevelopmentAgency, Media } from "@prisma/client"
import { useTranslations } from "next-intl"
import { MediaTypeEnum } from "@/types/formSchemas"
import { MediaSourceType } from "@prisma/client"

const getFormSchema = (media?: Media) => {
  return z.object({
    title: z.string().min(2, { message: "Title must be at least 2 characters." }),
    description: z.string().min(2, { message: "Description must be at least 2 characters." }),
    localDevelopmentAgencyId: z.coerce.number({ required_error: "Please select a local development agency." }),
    mediaType: MediaTypeEnum,
    mediaSourceTypeId: z.coerce.number({ required_error: "Please select a media source type." }),
    file: z
      .any()
      .optional()
      .refine(
        (file) => {
          if (!file || file instanceof File) return true;
          return false;
        },
        { message: "Invalid file" }
      )
      .refine(
        (file) => {
          if (!file || !(file instanceof File)) return true;
          return ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"].includes(file.type);
        },
        { message: "Invalid file type" }
      )
      .refine(
        (file) => {
          // Require file only if no existing media and no file
          if (!media && !(file instanceof File)) return false;
          return true;
        },
        { message: "File is required" }
      ),
  })
}

interface FormDialogProps {
  media?: Media,
  lda?: LocalDevelopmentAgency,
  ldas?: LocalDevelopmentAgency[],
  mediaSourceTypes?: MediaSourceType[],
  callback: (media_id?: string) => void
}

export function FormDialog({ media, lda, ldas, mediaSourceTypes, callback }: FormDialogProps) {
  const [open, setOpen] = useState(false)

  const tC = useTranslations('common')

  const FormSchema = getFormSchema(media)

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      title: media ? media.title : "",
      description: media ? media?.description : "",
      localDevelopmentAgencyId: media?.localDevelopmentAgencyId ?? lda?.id ?? 0,
      mediaType: media ? media.mediaType : undefined,
      mediaSourceTypeId: media && media.mediaSourceTypeId !== null ? media.mediaSourceTypeId : undefined,
    },
  })

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setOpen(false);
    const formData = new FormData();
    formData.append("title", data.title);
    formData.append("description", data.description);
    formData.append("localDevelopmentAgencyId", data.localDevelopmentAgencyId.toString());
    formData.append("mediaSourceTypeId", data.mediaSourceTypeId.toString());
    formData.append("mediaType", data.mediaType);

    if (data.file instanceof File) {
      formData.append("file", data.file);
    }

    const method = media ? "PUT" : "POST";
    const endpoint = media ? `/api/media/${media.id}` : `/api/media`;

    toast({ title: media ? "Updating media..." : "Creating media...", variant: "processing" });

    await fetch(endpoint, {
      method,
      body: formData,
    });

    toast({ title: media ? "Media updated" : "Media created", variant: "success" });
    callback(media?.id?.toString());
    if (!media) {
      form.reset({
        title: "",
        description: "",
        localDevelopmentAgencyId: lda?.id ?? 0,
        mediaType: undefined,
        mediaSourceTypeId: undefined,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        
          {media ? 
            <span className="flex items-center gap-2 hover:cursor-pointer w-full"><PencilIcon size={10} /> Edit</span>
            : <Button>
              <PlusIcon />
              <span className="hidden md:inline">Upload media</span>
              </Button> }
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl w-full p-0 gap-0 flex flex-col">
        <DialogHeader className="p-5 border-b">
          <DialogTitle>{media ? "Edit" : "Add"} media</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow contents">
            <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: 'calc(90vh - 220px)' }}>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
              )}
            />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea rows={5} className="resize-none" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {ldas && (
                  <FormField
                    control={form.control}
                    name="localDevelopmentAgencyId"
                    render={({ field }) => (
                      <FormItem className="flex-1 w-full">
                        <FormLabel>Local Development Agency</FormLabel>
                        <Select value={field.value?.toString()} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ldas.map((lda) => (
                              <SelectItem
                                key={lda.id}
                                value={lda.id.toString()}
                              >
                                {lda.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />)}
                <FormField
                  control={form.control}
                  name="file"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{media ? 'Replace File' : 'Upload File'}</FormLabel>
                      {media && (
                        <div className="mb-2 text-sm flex items-center gap-2">
                          <span className="font-medium">Current file:</span>
                          <span className="text-muted-foreground">{media.filePath.split('/').pop()}</span>
                        </div>
                      )}
                      <FormControl>
                        <Input
                          id="file"
                          type="file"
                          accept="image/*,image/webp"
                          onChange={(e) => {
                            field.onChange(e.target.files?.[0])
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                </FormItem>
              )}
            />
                <FormField
                  control={form.control}
                  name="mediaType"
                  render={({ field }) => (
                    <FormItem className="flex-1 w-full">
                      <FormLabel>Media Type</FormLabel>
                      <Select value={field.value?.toString()} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MediaTypeEnum.options.map((mediaType) => (
                            <SelectItem
                              key={mediaType}
                              value={mediaType}
                            >
                              {tC(`mediaTypes.${mediaType}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} 
                />

                <FormField
                  control={form.control}
                  name="mediaSourceTypeId"
                  render={({ field }) => (
                    <FormItem className="flex-1 w-full">
                      <FormLabel>Media Source Type</FormLabel>
                      <Select value={field.value?.toString()} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mediaSourceTypes?.map((mediaSourceType) => (
                            <SelectItem
                              key={mediaSourceType.id}
                              value={mediaSourceType.id.toString()}
                            >
                              {mediaSourceType.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <DialogFooter className="flex sm:justify-between flex-col sm:flex-row gap-2 px-4 pb-4 pt-2 border-t mt-auto">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={form.handleSubmit(onSubmit)}
                disabled={form.formState.isSubmitting}
                className="w-full sm:w-auto"
              >
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {media ? "Save changes" : "Create media"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
