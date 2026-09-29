import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppShell } from '@/components/Layout/AppShell';

export const metadata: Metadata = {
  title: 'Personal Finance & Expense Tracker | PWA',
  description: 'Gestor móvil de gastos personales, cuotas y deudas en ARS y USD con Telegram Bot y Supabase',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Finance Tracker',
  },
};

export const viewport: Viewport = {
  themeColor: '#F4F1EA',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="font-sans antialiased text-black bg-[#F4F1EA]">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
