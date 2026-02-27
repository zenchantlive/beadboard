'use client';

import { useState, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

const themes = [
  { id: 'aurora', name: 'Aurora', desc: 'Warm charcoal + cyan' },
  { id: 'midnight', name: 'Midnight', desc: 'Cool blue-purple' },
  { id: 'forest', name: 'Forest', desc: 'Earthy green-brown' },
  { id: 'dusk', name: 'Dusk', desc: 'Sunset orange-pink' },
  { id: 'contrast', name: 'Contrast', desc: 'High contrast' },
] as const;

export function ThemeToggle() {
  const [currentTheme, setCurrentTheme] = useState<string>('aurora');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load saved theme from localStorage
    const saved = localStorage.getItem('beadboard-theme');
    if (saved && themes.find(t => t.id === saved)) {
      setCurrentTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    }
  }, []);

  const handleThemeChange = (themeId: string) => {
    setCurrentTheme(themeId);
    document.documentElement.setAttribute('data-theme', themeId);
    localStorage.setItem('beadboard-theme', themeId);
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <button className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-tertiary)]">
        <Palette className="h-4 w-4" />
      </button>
    );
  }

  const current = themes.find(t => t.id === currentTheme) || themes[0];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-tertiary)] transition-colors hover:bg-[var(--alpha-white-low)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-info)]"
          aria-label="Change theme"
        >
          <Palette className="h-4 w-4" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[200px] rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-overlay)] p-2 shadow-[var(--shadow-lg)] backdrop-blur-lg z-50"
          sideOffset={8}
          align="end"
        >
          <div className="px-2 py-1.5 mb-1">
            <p className="text-xs font-semibold text-[var(--text-primary)]">Theme</p>
            <p className="text-[10px] text-[var(--text-tertiary)]">{current.desc}</p>
          </div>

          <DropdownMenu.Separator className="h-px bg-[var(--border-subtle)] my-1" />

          {themes.map((theme) => (
            <DropdownMenu.Item
              key={theme.id}
              onClick={() => handleThemeChange(theme.id)}
              className="flex items-center justify-between rounded-lg px-2 py-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--alpha-white-low)] hover:text-[var(--text-primary)] cursor-pointer outline-none transition-colors"
            >
              <span>{theme.name}</span>
              {currentTheme === theme.id && (
                <Check className="h-3.5 w-3.5 text-[var(--accent-success)]" />
              )}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
