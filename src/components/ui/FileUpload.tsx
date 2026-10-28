import { useState, useRef, type DragEvent, type ChangeEvent } from 'react'
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X } from 'lucide-react'

export interface UploadedFileItem {
  id: string
  name: string
  size: number
  status: 'uploading' | 'completed' | 'error'
  progress?: number
  errorMessage?: string
}

export interface FileUploadProps {
  label?: string
  helperText?: string
  accept?: string
  maxSizeMb?: number
  multiple?: boolean
  files?: UploadedFileItem[]
  onFilesSelected?: (files: File[]) => void
  onFileRemove?: (fileId: string) => void
  disabled?: boolean
  className?: string
}

export function FileUpload({
  label,
  helperText = 'PDF, PNG, JPG or DOCX up to 10MB',
  accept,
  maxSizeMb = 10,
  multiple = false,
  files = [],
  onFilesSelected,
  onFileRemove,
  disabled = false,
  className = '',
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragOver(true)
  }

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (disabled) return

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const selected = Array.from(e.dataTransfer.files)
      if (onFilesSelected) onFilesSelected(selected)
    }
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files)
      if (onFilesSelected) onFilesSelected(selected)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-neutral-800">
          {label}
        </label>
      )}

      {/* Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all cursor-pointer ${
          disabled
            ? 'border-neutral-200 bg-neutral-50 cursor-not-allowed opacity-60'
            : isDragOver
            ? 'border-brand-500 bg-brand-50/60 ring-4 ring-brand-500/10'
            : 'border-neutral-300 bg-white hover:border-neutral-400 hover:bg-neutral-50/50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          disabled={disabled}
          className="hidden"
        />

        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600 mb-3">
          <UploadCloud className="h-5 w-5" />
        </div>

        <p className="text-sm font-semibold text-neutral-800">
          Click to upload <span className="font-normal text-neutral-500">or drag & drop</span>
        </p>

        <p className="mt-1 text-xs text-neutral-400">
          {helperText} (Max {maxSizeMb}MB)
        </p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-2.5 text-xs shadow-2xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="h-4 w-4 shrink-0 text-neutral-500" />
                <div className="min-w-0">
                  <p className="font-medium text-neutral-800 truncate">{file.name}</p>
                  <p className="text-[11px] text-neutral-400">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {file.status === 'completed' && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                )}
                {file.status === 'error' && (
                  <span className="flex items-center gap-1 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-[11px]">{file.errorMessage || 'Failed'}</span>
                  </span>
                )}
                {file.status === 'uploading' && (
                  <span className="text-brand-600 font-medium">
                    {file.progress ?? 50}%
                  </span>
                )}

                {onFileRemove && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onFileRemove(file.id)
                    }}
                    className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

