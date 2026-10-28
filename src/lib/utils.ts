/**
 * lib/utils.ts
 * Small, reusable utility helpers for ShareSphere.
 */

/**
 * Merge class names, filtering out falsy values.
 * Useful for conditionally applying CSS / Tailwind classes.
 *
 * @example
 *   cn('btn', isActive && 'btn--active', undefined)
 *   // → 'btn btn--active'
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

/**
 * Format an ISO date string into a human-readable short date.
 *
 * @example
 *   formatDate('2025-06-15T00:00:00Z') // → 'Jun 15, 2025'
 */
export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Truncate a string to `maxLength` characters, appending '…' if needed.
 *
 * @example
 *   truncate('Hello, world!', 7) // → 'Hello, …'
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1)}…`
}

/**
 * Generate a URL-safe slug from any string.
 *
 * @example
 *   slugify('Hello World!') // → 'hello-world'
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

/**
 * Sleep for `ms` milliseconds. Useful in async/await flows.
 *
 * @example
 *   await sleep(500) // wait 500 ms
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
