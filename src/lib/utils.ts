import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * cn helper function to merge Tailwind classes dynamically.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
