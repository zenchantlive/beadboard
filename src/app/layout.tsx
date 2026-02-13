import type { Metadata } from 'next';
import { DM_Sans, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-ui',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'BeadBoard',
  description: 'Windows-native Beads dashboard',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${jetbrainsMono.variable}`}>{children}</body>
    </html>
  );
}
