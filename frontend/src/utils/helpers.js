/**
 * Utility Functions
 * 
 * Common utility functions used throughout the application.
 * 
 * @file src/lib/utils.js
 */

import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines and merges CSS class names
 * 
 * This function combines clsx (for conditional classes) with tailwind-merge
 * (for merging Tailwind CSS classes and resolving conflicts).
 * 
 * @param {...any} inputs - Class names or objects with conditional classes
 * @returns {string} Merged class name string
 * 
 * @example
 * cn('px-2', 'px-4') // Returns 'px-4' (px-2 is overridden)
 * cn('text-red-500', { 'text-blue-500': isActive }) // Conditional classes
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

