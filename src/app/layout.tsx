import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SST MedSys — Sistema de Gestión en Salud Ocupacional",
  description: "Plataforma integral de gestión de pacientes, evaluaciones médicas ocupacionales y certificados de aptitud laboral (CMALAB).",
};

import { Toaster } from "react-hot-toast";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} antialiased`}>
        <main className="min-h-screen">
          {children}
        </main>
        <Toaster position="top-right" toastOptions={{ style: { borderRadius: '0.75rem', fontSize: '0.875rem' } }} />
      </body>
    </html>
  );
}