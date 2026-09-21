"use client"

import { useEffect, useId, useRef, useState } from "react"
import Image from "next/image"
import { ImageIcon, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment"
import { avatarUrl as imageUrl } from "@/lib/avatar"
import { LDA_LOGO_ACCEPT, logoFileError } from "@/lib/lda-logo"

export type LogoChange = { file?: File; remove?: boolean }

interface LogoUploadProps {
  currentLogo: string | null
  name: string
  value: LogoChange
  onChange: (value: LogoChange) => void
  disabled: boolean
}

export function LogoUpload({ currentLogo, name, value, onChange, disabled }: LogoUploadProps) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const uploadButton = useRef<HTMLButtonElement>(null)
  const [preview, setPreview] = useState<string>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (!value.file) {
      setPreview(undefined)
      return
    }
    const url = URL.createObjectURL(value.file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [value.file])

  const hasLogo = Boolean(value.file || (currentLogo && !value.remove))
  const src = value.file ? preview : !value.remove ? imageUrl(currentLogo) : undefined
  const filename = value.file?.name || currentLogo?.split(/[?#]/)[0].split("/").pop() || `${name} logo`
  const fileSize = value.file
    ? value.file.size >= 1024 * 1024
      ? `${(value.file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(value.file.size / 1024))} KB`
    : undefined

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`${id}-upload`}>Logo</Label>
      <Button
        ref={uploadButton}
        id={`${id}-upload`}
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`}
        onClick={() => input.current?.click()}
      >
        <Upload data-icon="inline-start" aria-hidden="true" />
        Upload logo
      </Button>
      <p id={`${id}-help`} className="text-xs leading-relaxed text-muted-foreground">
        PNG, JPEG or WebP. Max 5 MB.
      </p>
      {hasLogo && (
        <Attachment
          className="mt-1 w-full min-w-0"
          state={value.file ? disabled ? "uploading" : "idle" : "done"}
        >
          <AttachmentMedia variant={src ? "image" : "icon"} className="[&_img]:object-contain">
            {src ? (
              <Image
                src={src}
                alt={`${name} logo`}
                width={48}
                height={48}
                unoptimized
                className="size-full object-contain"
              />
            ) : <ImageIcon aria-hidden="true" />}
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle title={filename}>{filename}</AttachmentTitle>
            <AttachmentDescription>
              {value.file
                ? `${value.file.type.split("/")[1].toUpperCase()} · ${fileSize} · ${disabled ? "Uploading…" : "Ready to save"}`
                : "Current logo"}
            </AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <Tooltip>
              <TooltipTrigger asChild>
                <AttachmentAction
                  type="button"
                  aria-label="Remove logo"
                  disabled={disabled}
                  onClick={() => {
                    onChange({ remove: true })
                    setError(undefined)
                    if (input.current) input.current.value = ""
                    uploadButton.current?.focus()
                  }}
                >
                  <X aria-hidden="true" />
                </AttachmentAction>
              </TooltipTrigger>
              <TooltipContent>Remove logo</TooltipContent>
            </Tooltip>
          </AttachmentActions>
        </Attachment>
      )}
      <input
        ref={input}
        id={id}
        type="file"
        className="hidden"
        accept={LDA_LOGO_ACCEPT}
        disabled={disabled}
        aria-label="Choose logo file"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (!file) return
          const validationError = logoFileError(file)
          setError(validationError)
          if (!validationError) onChange({ file })
          // Allow selecting the same file again, including after a validation error.
          event.target.value = ""
        }}
      />
      {error && <p id={`${id}-error`} role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
