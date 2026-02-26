import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getArchetypeDisplayChar(archetype: { icon?: string; name: string }): string {
    return archetype.icon || archetype.name.charAt(0) || '?';
}
