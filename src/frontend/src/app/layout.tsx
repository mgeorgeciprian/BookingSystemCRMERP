import type { Metadata } from "next";
import "@/styles/globals.css";

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
    <html lang="ro">
      <body>{children}</body>
    </html>
  );
}
