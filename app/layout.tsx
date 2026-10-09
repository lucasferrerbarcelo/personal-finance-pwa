import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppShell } from '@/components/Layout/AppShell';
import { ThemeProvider } from '@/lib/theme/ThemeContext';

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
    <html lang="es" data-theme="bauhaus" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('app-theme') || 'bauhaus';
                document.documentElement.setAttribute('data-theme', t);
                document.documentElement.classList.add('theme-' + t);
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased text-foreground bg-background transition-colors duration-150">
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
