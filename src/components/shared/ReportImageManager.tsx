import { useRef, useState, useCallback } from 'react'
import { useReportImages, useUploadReportImage, useDeleteReportImage, useReportImageBlob } from '@/hooks/useReports'
import { reportsApi } from '@/api/reports'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/api/client'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import type { ReportImage, ReportStatus, UserRole } from '@/types'
import { format } from 'date-fns'
import { Upload, Trash2, Download, ImageIcon, FileIcon } from 'lucide-react'

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/dicom',
]
const ALLOWED_EXTENSIONS = '.jpg,.jpeg,.png,.gif,.webp,.dcm'
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── Individual image card ────────────────────────────────────────────────────

interface ImageCardProps {
  reportId: string
  image: ReportImage
  canDelete: boolean
  onDeleteRequest: (image: ReportImage) => void
}

function ImageCard({ reportId, image, canDelete, onDeleteRequest }: ImageCardProps) {
  const isRasterImage = image.content_type.startsWith('image/')
  const { data: blobUrl, isLoading: blobLoading } = useReportImageBlob(
    isRasterImage ? reportId : undefined,
    isRasterImage ? image.id : undefined,
  )

  const handleDownload = async () => {
    try {
      const blob = await reportsApi.getImageBlob(reportId, image.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = image.filename
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // silently ignore — toast handled in parent if needed
    }
  }

  return (
    <div className="group relative flex flex-col rounded-lg border bg-card overflow-hidden">
      {/* Thumbnail area */}
      <div className="relative flex h-36 items-center justify-center bg-muted">
        {isRasterImage ? (
          blobLoading ? (
            <div className="flex items-center justify-center h-full w-full">
              <LoadingSpinner />
            </div>
          ) : blobUrl ? (
            <img
              src={blobUrl}
              alt={image.filename}
              className="h-full w-full object-contain"
            />
          ) : (
            <ImageIcon className="h-10 w-10 text-muted-foreground" />
          )
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <FileIcon className="h-10 w-10" />
            <span className="text-xs font-medium">DICOM</span>
          </div>
        )}

        {/* Action overlay */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8"
            title="Download"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4" />
          </Button>
          {canDelete && (
            <Button
              size="icon"
              variant="destructive"
              className="h-8 w-8"
              title="Delete"
              onClick={() => onDeleteRequest(image)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="p-2 space-y-0.5">
        <p className="truncate text-xs font-medium" title={image.filename}>
          {image.filename}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatBytes(image.file_size)} · {format(new Date(image.created_at), 'MMM d, yyyy')}
        </p>
      </div>
    </div>
  )
}


// ── Drop zone ────────────────────────────────────────────────────────────────

interface DropZoneProps {
  onFiles: (files: File[]) => void
  isUploading: boolean
}

function DropZone({ onFiles, isUploading }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragging(false), [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      onFiles(Array.from(e.dataTransfer.files))
    },
    [onFiles],
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFiles(Array.from(e.target.files))
      e.target.value = ''
    }
  }

  return (
    <div
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors ${
        isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
      } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <Upload className="h-8 w-8 text-muted-foreground" />
      <div className="text-center">
        <p className="text-sm font-medium">
          {isUploading ? 'Uploading…' : 'Drop files here or click to upload'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          JPEG, PNG, GIF, WebP, DICOM · max 10 MB each
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_EXTENSIONS}
        multiple
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

interface ReportImageManagerProps {
  reportId: string
  reportStatus: ReportStatus
  reportRadiologistId: string
  currentUserId: string
  currentUserRole: UserRole
}

export function ReportImageManager({
  reportId,
  reportStatus,
  reportRadiologistId,
  currentUserId,
  currentUserRole,
}: ReportImageManagerProps) {
  const { toast } = useToast()
  const [imageToDelete, setImageToDelete] = useState<ReportImage | null>(null)

  const { data: images = [], isLoading } = useReportImages(reportId)
  const uploadImage = useUploadReportImage()
  const deleteImage = useDeleteReportImage()

  // Business rules: only draft/amended allow management; radiologists only own reports
  const isEditableStatus = reportStatus === 'draft' || reportStatus === 'amended'
  const canManageImages =
    isEditableStatus &&
    (currentUserRole === 'admin' ||
      (currentUserRole === 'radiologist' && reportRadiologistId === currentUserId))

  const handleFiles = async (files: File[]) => {
    if (!canManageImages) return

    for (const file of files) {
      // Client-side validation
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        toast({
          variant: 'destructive',
          title: 'Unsupported file type',
          description: `"${file.name}" is not a supported format. Use JPEG, PNG, GIF, WebP, or DICOM.`,
        })
        continue
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: `"${file.name}" exceeds the 10 MB limit (${formatBytes(file.size)}).`,
        })
        continue
      }

      try {
        await uploadImage.mutateAsync({ reportId, file })
        toast({
          title: 'Image uploaded',
          description: `"${file.name}" has been attached to this report.`,
        })
      } catch (err) {
        toast({
          variant: 'destructive',
          title: 'Upload failed',
          description: getErrorMessage(err),
        })
      }
    }
  }

  const handleDeleteConfirm = async () => {
    if (!imageToDelete) return
    try {
      await deleteImage.mutateAsync({ reportId, imageId: imageToDelete.id })
      toast({
        title: 'Image removed',
        description: `"${imageToDelete.filename}" has been removed from this report.`,
      })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: getErrorMessage(err),
      })
    } finally {
      setImageToDelete(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Images
            {images.length > 0 && (
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                ({images.length})
              </span>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <LoadingSpinner text="Loading images…" />
        ) : images.length === 0 && !canManageImages ? (
          <p className="text-sm text-muted-foreground">No images attached to this report.</p>
        ) : (
          <>
            {images.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {images.map((img) => (
                  <ImageCard
                    key={img.id}
                    reportId={reportId}
                    image={img}
                    canDelete={canManageImages}
                    onDeleteRequest={setImageToDelete}
                  />
                ))}
              </div>
            )}

            {canManageImages && (
              <DropZone
                onFiles={handleFiles}
                isUploading={uploadImage.isPending}
              />
            )}

            {!canManageImages && images.length === 0 && (
              <p className="text-sm text-muted-foreground">No images attached to this report.</p>
            )}
          </>
        )}
      </CardContent>

      <ConfirmDialog
        open={!!imageToDelete}
        onOpenChange={(open) => { if (!open) setImageToDelete(null) }}
        title="Remove Image"
        message={`Remove "${imageToDelete?.filename}" from this report? This action cannot be undone.`}
        confirmLabel="Remove"
        onConfirm={handleDeleteConfirm}
        isLoading={deleteImage.isPending}
      />
    </Card>
  )
}
