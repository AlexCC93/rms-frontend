import { apiClient } from '@/api/client'

/**
 * Matches any /api/v1/reports/{id}/images/{id} path that appears inside an
 * HTML src attribute (or anywhere in a string).
 */
const API_IMG_RE = /\/api\/v1\/reports\/[^/'">\s]+\/images\/[^'">\s]+/g

// Per-session in-memory caches so we only fetch each image once.
const blobCache   = new Map<string, string>() // API path  → blob: URL
const reverseMap  = new Map<string, string>() // blob: URL → API path

/**
 * Scan `html` for /api/v1/reports/.../images/... src patterns,
 * fetch each with the user's Bearer token, create a blob: URL, and swap
 * the src in-place. Already-cached images are returned immediately.
 */
export async function resolveApiImageSrcs(html: string): Promise<string> {
  const paths = Array.from(new Set(html.match(API_IMG_RE) ?? []))
  if (paths.length === 0) return html

  await Promise.all(
    paths.map(async (path) => {
      if (blobCache.has(path)) return
      try {
        const response = await apiClient.get(path, { responseType: 'blob' })
        const blobUrl  = URL.createObjectURL(response.data)
        blobCache.set(path, blobUrl)
        reverseMap.set(blobUrl, path)
      } catch {
        // Leave the path as-is if the fetch fails; the image will be broken
        // but we won't crash the whole render.
      }
    }),
  )

  return html.replace(API_IMG_RE, (match) => blobCache.get(match) ?? match)
}

/**
 * Register a known api-path ↔ blob-URL pair into the caches.
 * Call this after uploading an image so the editor can embed the blob: URL
 * for display while restoreApiImageSrcs can still convert it back to the
 * stable API path before saving.
 */
export function registerBlobMapping(apiPath: string, blobUrl: string): void {
  blobCache.set(apiPath, blobUrl)
  reverseMap.set(blobUrl, apiPath)
}

/**
 * Before sending HTML back to the backend, swap any ephemeral blob: URLs that
 * we created back to their original /api/v1/... paths so the backend can keep
 * the stable references. New images (added during this edit) will still be
 * base64 data URIs, which the backend will extract and store as usual.
 */
export function restoreApiImageSrcs(html: string): string {
  return html.replace(/blob:[^'">\s]+/g, (match) => reverseMap.get(match) ?? match)
}
