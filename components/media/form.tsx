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
import { PencilIcon, PlusIcon } from "lucide-react"
import { useState } from "react"
import { LocalDevelopmentAgency, Media } from "@prisma/client"
import { useTranslations } from "next-intl"
import { MediaTypeEnum } from "@/types/formSchemas"

const getFormSchema = (media?: Media) => {
  return z.object({
    title: z.string().min(2, { message: "Title must be at least 2 characters." }),
    description: z.string().min(2, { message: "Description must be at least 2 characters." }),
    localDevelopmentAgencyId: z.coerce.number({ required_error: "Please select a local development agency." }),
    mediaType: MediaTypeEnum,
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
  callback: () => void
}

export function FormDialog({ media, lda, ldas, callback }: FormDialogProps) {
  const [open, setOpen] = useState(false)

  const tC = useTranslations('common')

  const FormSchema = getFormSchema(media)

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      title: media ? media.title : "",
      description: media ? media?.description : "",
      localDevelopmentAgencyId: media?.localDevelopmentAgencyId ?? lda?.id ?? 0,
      mediaType: media ? media.mediaType : undefined
    },
  })

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setOpen(false);
    const formData = new FormData();
    formData.append("title", data.title);
    formData.append("description", data.description);
    formData.append("localDevelopmentAgencyId", data.localDevelopmentAgencyId.toString());

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
    callback();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          {media ? <>
            <span className="hidden md:inline">Edit details</span>
            <PencilIcon />
          </>
            : <>
              <span className="hidden md:inline">Add media</span>
              <PlusIcon />
            </>}
        </Button>
      </DialogTrigger>
      <DialogContent className="min-w-[40vw]">
        <DialogHeader>
          <DialogTitle>{media ? "Edit" : "Add"} media</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  <FormLabel>{media?.filePath ? 'New File' : 'File'}</FormLabel>
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
              )} />
          </form>
        </Form>
        <DialogFooter>
          <Button type="submit" onClick={form.handleSubmit(onSubmit)}>{media ? "Save changes" : "Create media"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog >
  )
}
