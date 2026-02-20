import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import VerticalThemeProvider from "@/components/VerticalThemeProvider";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BookingCRM - Programari & CRM pentru afacerea ta",
  description:
    "Platforma SaaS de programari online, CRM si facturare electronica pentru saloane, cabinete dentare, terapie si fitness.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ro" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <VerticalThemeProvider>{children}</VerticalThemeProvider>
      </body>
    </html>
  );
}
