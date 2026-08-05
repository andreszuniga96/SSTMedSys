import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CRM Salud Ocupacional - Dra. Quirós",
  description: "Sistema de gestión integral para Seguridad y Salud en el Trabajo",
};

import { Toaster } from "react-hot-toast";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-slate-50 text-slate-900 antialiased`}>
        {/* Aquí integraremos la navegación superior/lateral del repositorio UI/UX más adelante */}
        <main className="min-h-screen">
          {children}
        </main>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}