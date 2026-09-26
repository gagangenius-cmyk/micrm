import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { QueryProvider } from '@/components/providers/QueryProvider';
import { Toaster } from '@/components/ui/toaster';
import { FormValidationProvider } from '@/components/ui/form-validation-provider';

// Self-hosted variable fonts (src/app/fonts): no build-time network fetch.
const inter = localFont({
  src: "./fonts/Inter-Variable.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

const playfair = localFont({
  src: "./fonts/PlayfairDisplay-Variable.woff2",
  variable: "--font-playfair",
  weight: "400 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Migrantly CRM",
  description: "Your world, unlocked. Lead, client, operations, and reporting platform for Migrantly.",
};

export const viewport: Viewport = {
  themeColor: "#0F1D3D",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="antialiased" suppressHydrationWarning>
        <QueryProvider>
          <AuthProvider>
            {children}
            <FormValidationProvider />
            <Toaster />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
