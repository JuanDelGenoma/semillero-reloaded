import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Site base path without trailing slash: '' at the root, '/<repo>' when the
 * app is hosted under a subpath such as GitHub Pages.
 */
export const SITE_BASE = import.meta.env.BASE_URL.replace(/\/+$/, '')

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
