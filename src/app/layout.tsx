import type { Metadata } from 'next';
import { Noto_Sans } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const notoSans = Noto_Sans({
  subsets: ['latin'],
  variable: '--font-ui',
});

export const metadata: Metadata = {
  title: 'BeadBoard',
  description: 'Windows-native Beads dashboard',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={notoSans.variable}>{children}</body>
    </html>
  );
}
