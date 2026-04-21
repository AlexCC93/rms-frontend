import { useEffect, useRef, useCallback } from 'react'
import SignaturePadLib from 'signature_pad'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface SignaturePadProps {
  /** Existing SVG string to display as a preview when in read-only mode */
  initialSvg?: string | null
  /** Called with the new SVG string after every stroke ends, or null after clear */
  onChange?: (svg: string | null) => void
  readOnly?: boolean
}

export function SignaturePad({ initialSvg, onChange, readOnly = false }: SignaturePadProps) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const padRef = useRef<SignaturePadLib | null>(null)

  /** Scale canvas for the current devicePixelRatio and clear */
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    canvas.width = canvas.offsetWidth * ratio
    canvas.height = canvas.offsetHeight * ratio
    canvas.getContext('2d')?.scale(ratio, ratio)
    padRef.current?.clear()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const pad = new SignaturePadLib(canvas, {
      penColor: '#1e293b',
      minWidth: 1,
      maxWidth: 3,
    })
    padRef.current = pad

    resizeCanvas()

    if (readOnly) {
      pad.off()
    } else {
      pad.addEventListener('endStroke', () => {
        if (!padRef.current) return
        const svg = padRef.current.isEmpty() ? null : padRef.current.toSVG()
        onChange?.(svg)
      })
    }

    const handleResize = () => resizeCanvas()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      pad.off()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly])

  const handleClear = () => {
    padRef.current?.clear()
    onChange?.(null)
  }

  return (
    <div className="space-y-2">
      {/* Canvas drawing area */}
      <div className="relative rounded-md border border-input bg-white overflow-hidden">
        {readOnly && initialSvg ? (
          <div
            className="w-full h-40 flex items-center justify-center p-2"
            dangerouslySetInnerHTML={{ __html: initialSvg }}
          />
        ) : (
          <canvas
            ref={canvasRef}
            className="w-full h-40 touch-none cursor-crosshair"
            style={{ display: 'block' }}
          />
        )}
        {!readOnly && (
          <div className="absolute inset-0 pointer-events-none flex items-end justify-center pb-2">
            <span className="text-xs text-muted-foreground select-none">
              {t('profile.signatureDrawHint')}
            </span>
          </div>
        )}
      </div>

      {/* Existing signature preview when in edit mode */}
      {!readOnly && initialSvg && (
        <div className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 p-2">
          <p className="text-xs text-muted-foreground mb-1">{t('profile.signatureCurrent')}</p>
          <div
            className="w-full h-16 flex items-center"
            dangerouslySetInnerHTML={{ __html: initialSvg }}
          />
        </div>
      )}

      {!readOnly && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          className="gap-2"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t('profile.clearSignature')}
        </Button>
      )}
    </div>
  )
}
