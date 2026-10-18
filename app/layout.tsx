import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { LanguageProvider } from "@/components/i18n/language-provider";
import { getLocale, getTranslations } from "@/lib/i18n/server";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: "MVBooking", description: t("Car rental booking platform MVP for Georgia") };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <LanguageProvider initialLocale={locale}>
          <SiteHeader />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
