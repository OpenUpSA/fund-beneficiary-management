import React, { useState, useRef } from 'react'
import { UploadCloud, X, FileIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Field } from '@/types/forms'

interface FileUploadProps {
  field: Field
  isEditing?: boolean
  lda_id?: number
  onValueChange?: (field: Field, value: string) => void
}

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  url: string
  filePath?: string
  dbId?: number
}

export function FileUpload({ field, isEditing = false, onValueChange, lda_id }: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>(() => {
    if (field.value) {
      try {
        return JSON.parse(field.value)
      } catch {
        return []
      }
    }
    return []
  })
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadingFile, setUploadingFile] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isEditing) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    if (!isEditing) return
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    handleFiles(droppedFiles)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files))
    }
  }

  const uploadFile = async (file: File): Promise<UploadedFile | null> => {
    try {
      // Create form data for upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', file.name)
      formData.append('description', `Uploaded from form: ${field.name}`)
      
      // Add LDA ID if available
      if (lda_id) {
        formData.append('localDevelopmentAgencyId', String(lda_id))
      } else {
        // If no LDA ID, we can't upload - this is required by the API
        toast.error('Missing LDA ID for file upload')
        return null
      }
      
      setUploadingFile(file.name)
      
      // Upload to media API
      const response = await fetch('/api/media', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      // Return uploaded file info
      return {
        id: String(result.id),
        name: file.name,
        size: file.size,
        type: file.type,
        url: `${process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT}/${result.filePath}`,
        filePath: result.filePath,
        dbId: result.id
      }
    } catch (error) {
      console.error('File upload error:', error)
      toast.error(`Failed to upload ${file.name}`)
      return null
    }
  }

  const handleFiles = async (selectedFiles: File[]) => {
    if (!isEditing || selectedFiles.length === 0) return
    
    setIsUploading(true)
    
    try {
      const uploadPromises = selectedFiles.map(file => uploadFile(file))
      const results = await Promise.all(uploadPromises)
      const successfulUploads = results.filter(Boolean) as UploadedFile[]
      
      if (successfulUploads.length > 0) {
        const updatedFiles = [...files, ...successfulUploads]
        setFiles(updatedFiles)
        
        if (onValueChange) {
          onValueChange(field, JSON.stringify(updatedFiles))
        }
        
        if (successfulUploads.length < selectedFiles.length) {
          toast.warning(`${successfulUploads.length} of ${selectedFiles.length} files uploaded successfully`)
        } else {
          toast.success(`${successfulUploads.length} file(s) uploaded successfully`)
        }
      }
    } catch (error) {
      console.error('Error handling files:', error)
      toast.error('File upload failed')
    } finally {
      setIsUploading(false)
      setUploadingFile('')
    }
  }

  const removeFile = (id: string) => {
    if (!isEditing) return
    
    const updatedFiles = files.filter(file => file.id !== id)
    setFiles(updatedFiles)
    
    if (onValueChange) {
      onValueChange(field, JSON.stringify(updatedFiles))
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    else return (bytes / 1048576).toFixed(1) + ' MB'
  }

  const isImageFile = (type: string): boolean => {
    return type.startsWith('image/')
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Upload area */}
      <div
        className={cn(
          "border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center gap-2 transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-gray-300",
          isEditing ? "cursor-pointer hover:border-primary hover:bg-gray-50" : "opacity-80 cursor-not-allowed",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => isEditing && fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          onChange={handleFileChange}
          disabled={!isEditing || isUploading}
        />
        {isUploading ? (
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
        ) : (
          <UploadCloud className={cn("h-10 w-10", isDragging ? "text-primary" : "text-gray-400")} />
        )}
        <p className="text-sm text-center">
          {isUploading ? (
            <>Uploading {uploadingFile}...</>
          ) : (
            <>
              <span className="font-medium text-primary">Click to upload</span> or drag and drop
              <br />
              <span className="text-xs text-gray-500">PNG, JPG, JPEG, WEBP, GIF</span>
            </>
          )}
        </p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-4">
          {/* Image files displayed horizontally */}
          {files.some(file => isImageFile(file.type)) && (
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">Images</p>
              <div className="flex flex-wrap gap-3">
                {files.filter(file => isImageFile(file.type)).map((file) => (
                  <div 
                    key={file.id} 
                    className="relative group"
                  >
                    <div className="h-24 w-24 rounded-md overflow-hidden bg-gray-200 border border-gray-300 shadow-sm hover:shadow-md transition-shadow">
                      <img 
                        src={file.url} 
                        alt={file.name} 
                        className="h-full w-full object-cover" 
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(file.url, '_blank')
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                    {isEditing && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="h-6 w-6 p-0 absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile(file.id)
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                    <p className="text-xs text-center mt-1 truncate w-24">{file.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Non-image files displayed in list */}
          {files.some(file => !isImageFile(file.type)) && (
            <div>
              <p className="text-sm font-medium mb-2">Files</p>
              <div className="space-y-2">
                {files.filter(file => !isImageFile(file.type)).map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center gap-3">
                      <FileIcon className="h-10 w-10 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    {isEditing && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile(file.id)
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}