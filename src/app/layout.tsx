import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MailPulse — Plataforma de Email Marketing",
  description:
    "Plataforma moderna de envio de email marketing com multi-provedor, régua automatizada e analytics em tempo real.",
  keywords: ["email marketing", "automação", "prospecção", "campanhas"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
          fetchPriority="high"
        />
      </head>
      <body className="min-h-dvh bg-surface-950 font-sans text-surface-100 antialiased">
        {children}
      </body>
    </html>
  );
}
