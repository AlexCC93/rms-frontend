import { useState, useEffect } from 'react'
import { resolveApiImageSrcs } from '@/utils/resolveReportImages'

/**
 * Resolves any /api/v1/reports/.../images/... src patterns in `rawHtml` to
 * authenticated blob: URLs so they can safely be used in dangerouslySetInnerHTML.
 * Returns the original string synchronously on the first render, then the
 * resolved version once all fetches complete.
 */
export function useResolvedHtml(rawHtml: string | undefined): string {
  const [resolved, setResolved] = useState<string>(rawHtml ?? '')

  useEffect(() => {
    if (!rawHtml) {
      setResolved('')
      return
    }
    let cancelled = false
    resolveApiImageSrcs(rawHtml).then((html) => {
      if (!cancelled) setResolved(html)
    })
    return () => {
      cancelled = true
    }
  }, [rawHtml])

  return resolved
}
