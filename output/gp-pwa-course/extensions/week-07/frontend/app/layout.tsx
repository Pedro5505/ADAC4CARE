import type { Metadata } from 'next';
import { RoleProvider } from '@/components/role-provider';
import './globals.css';
import { PwaStatus } from '@/components/pwa-status';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'ADAC4CARE | Medication management',
  description: 'Safer, calmer medication management for disability and community care.',
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'ADAC4CARE | Medication management',
    description: 'Safer medication management for every shift.',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'ADAC4CARE medication management' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ADAC4CARE | Medication management',
    description: 'Safer medication management for every shift.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-AU"><body><RoleProvider><PwaStatus />{children}</RoleProvider></body></html>;
}
