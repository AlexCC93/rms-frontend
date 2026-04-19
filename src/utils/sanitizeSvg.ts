/**
 * Sanitize an SVG string before sending to the backend.
 * Strips <script> elements, on* event attributes, and external href/src URLs
 * to prevent stored XSS if the SVG is ever rendered in a browser context.
 */
export function sanitizeSvg(svgString: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgString, 'image/svg+xml')

  // Remove <script> elements
  doc.querySelectorAll('script').forEach((el) => el.remove())

  // Walk every element and strip dangerous attributes
  doc.querySelectorAll('*').forEach((el) => {
    const attrsToRemove: string[] = []

    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase()
      const value = attr.value.toLowerCase().trim()

      // Strip on* event handlers (onclick, onmouseover, etc.)
      if (name.startsWith('on')) {
        attrsToRemove.push(attr.name)
        continue
      }

      // Strip external URLs in href and src (allow fragment-only # refs)
      if (name === 'href' || name === 'xlink:href' || name === 'src') {
        if (
          value.startsWith('http') ||
          value.startsWith('//') ||
          value.startsWith('javascript:') ||
          value.startsWith('data:')
        ) {
          attrsToRemove.push(attr.name)
        }
      }
    }

    attrsToRemove.forEach((name) => el.removeAttribute(name))
  })

  const svgEl = doc.documentElement
  return svgEl.outerHTML
}
