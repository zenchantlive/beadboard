import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getArchetypeDisplayChar(archetype: { icon?: string; name: string }): string {
    return archetype.icon || archetype.name.charAt(0) || '?';
}

export function getTemplateDisplayChar(template: { icon?: string; name: string }): string {
    return template.icon || template.name.charAt(0) || '?';
}

export function getTemplateColor(template: { color?: string }): string {
    return template.color || '#f59e0b';
}
