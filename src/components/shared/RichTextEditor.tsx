import { useRef, useCallback, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import ImageExtension from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import { useToast } from '@/hooks/use-toast'
import { reportsApi } from '@/api/reports'
import { registerBlobMapping } from '@/utils/resolveReportImages'
import {
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ImageIcon,
  Undo2,
  Redo2,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/dicom']
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ── Toolbar primitives ───────────────────────────────────────────────────────

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      // onMouseDown keeps focus inside the editor
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded text-sm transition-colors',
        'hover:bg-muted disabled:pointer-events-none disabled:opacity-40',
        active ? 'bg-muted text-foreground' : 'text-muted-foreground',
      )}
    >
      {children}
    </button>
  )
}

function Sep() {
  return <div className="mx-1 h-5 w-px bg-border shrink-0" />
}

// ── Main component ───────────────────────────────────────────────────────────

export interface RichTextEditorProps {
  /** Initial HTML content — changing this prop after mount will NOT reset the editor (use key). */
  initialValue?: string
  onChange?: (html: string) => void
  placeholder?: string
  readOnly?: boolean
  /** If provided, images are uploaded to the backend before being embedded. */
  reportId?: string
  minHeight?: string
}

export function RichTextEditor({
  initialValue = '',
  onChange,
  placeholder = 'Start typing…',
  readOnly = false,
  reportId,
  minHeight = '180px',
}: RichTextEditorProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      ImageExtension.configure({ inline: false, allowBase64: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
    ],
    content: initialValue || '',
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChangeRef.current?.(editor.getHTML())
    },
  })

  // Sync readOnly prop changes without remounting
  useEffect(() => {
    editor?.setEditable(!readOnly)
  }, [editor, readOnly])

  const handleImageInsert = useCallback(
    async (file: File) => {
      if (!editor) return

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        toast({
          variant: 'destructive',
          title: 'Unsupported file type',
          description: `"${file.name}" is not a supported format. Use JPEG, PNG, GIF, WebP, or DICOM.`,
        })
        return
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: `"${file.name}" exceeds the 10 MB limit.`,
        })
        return
      }

      try {
        if (reportId) {
          // 1. Upload once — get the stable API path.
          const uploaded = await reportsApi.uploadImage(reportId, file)
          const apiPath = `/api/v1/reports/${reportId}/images/${uploaded.id}`
          // 2. Fetch the blob for immediate display in the editor.
          const blob = await reportsApi.getImageBlob(reportId, uploaded.id)
          const blobUrl = URL.createObjectURL(blob)
          // 3. Register the two-way mapping so resolveApiImageSrcs and
          //    restoreApiImageSrcs can translate between them.
          registerBlobMapping(apiPath, blobUrl)
          // 4. Embed the blob: URL — editor displays it; on save the blob: URL
          //    is swapped back to apiPath so the backend sees no new base64.
          editor.chain().focus().setImage({ src: blobUrl, alt: file.name }).run()
        } else {
          // Report not yet created — embed directly as base64.
          const base64 = await fileToBase64(file)
          editor.chain().focus().setImage({ src: base64, alt: file.name }).run()
        }
      } catch {
        toast({
          variant: 'destructive',
          title: 'Image insert failed',
          description: 'Could not attach the image. Please try again.',
        })
      }
    },
    [editor, reportId, toast],
  )

  // Intercept paste events that carry image data
  useEffect(() => {
    const view = editor?.view
    if (!view) return
    const dom = view.dom as HTMLElement

    const handler = (e: Event) => {
      const clipEvent = e as ClipboardEvent
      const items = Array.from(clipEvent.clipboardData?.items ?? [])
      const imageItem = items.find((item) => item.type.startsWith('image/'))
      if (imageItem) {
        clipEvent.preventDefault()
        const file = imageItem.getAsFile()
        if (file) handleImageInsert(file)
      }
    }

    dom.addEventListener('paste', handler)
    return () => dom.removeEventListener('paste', handler)
  }, [editor, handleImageInsert])

  if (!editor) return null

  // ── Heading selector helper ──────────────────────────────────────────────

  const getHeadingValue = () => {
    if (editor.isActive('heading', { level: 1 })) return 'h1'
    if (editor.isActive('heading', { level: 2 })) return 'h2'
    if (editor.isActive('heading', { level: 3 })) return 'h3'
    return 'p'
  }

  const applyHeading = (val: string) => {
    if (val === 'p') editor.chain().focus().setParagraph().run()
    else editor.chain().focus().setHeading({ level: Number(val.charAt(1)) as 1 | 2 | 3 }).run()
  }

  return (
    <div className={cn('rounded-md border bg-background overflow-hidden', readOnly && 'border-transparent bg-transparent')}>
      {/* ── Toolbar ── */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5 bg-muted/40">
          {/* Undo / Redo */}
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </ToolbarButton>

          <Sep />

          {/* Paragraph / Heading */}
          <Select value={getHeadingValue()} onValueChange={applyHeading}>
            <SelectTrigger className="h-7 w-[108px] text-xs px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="p" className="text-xs">Paragraph</SelectItem>
              <SelectItem value="h1" className="text-xs">Heading 1</SelectItem>
              <SelectItem value="h2" className="text-xs">Heading 2</SelectItem>
              <SelectItem value="h3" className="text-xs">Heading 3</SelectItem>
            </SelectContent>
          </Select>

          <Sep />

          {/* Bold / Italic */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </ToolbarButton>

          <Sep />

          {/* Text alignment */}
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            active={editor.isActive({ textAlign: 'left' })}
            title="Align left"
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            active={editor.isActive({ textAlign: 'center' })}
            title="Align center"
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            active={editor.isActive({ textAlign: 'right' })}
            title="Align right"
          >
            <AlignRight className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            active={editor.isActive({ textAlign: 'justify' })}
            title="Justify"
          >
            <AlignJustify className="h-3.5 w-3.5" />
          </ToolbarButton>

          <Sep />

          {/* Insert image */}
          <ToolbarButton
            onClick={() => fileInputRef.current?.click()}
            title="Insert image"
          >
            <ImageIcon className="h-3.5 w-3.5" />
          </ToolbarButton>

          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.webp,.dcm"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                handleImageInsert(file)
                e.target.value = ''
              }
            }}
          />
        </div>
      )}

      {/* ── Editor area ── */}
      <EditorContent
        editor={editor}
        className="rte-content px-4 py-3 focus-within:outline-none"
        style={{ minHeight }}
      />
    </div>
  )
}
