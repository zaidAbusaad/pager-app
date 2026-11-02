import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Geist, Geist_Mono, Noto_Sans_Arabic } from "next/font/google";
import { notFound } from "next/navigation";
import { locale as localeFromUrl } from "next/root-params";
import { directionOf, routing } from "@/i18n/routing";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Geist has no Arabic letters. This font fills in, so Arabic looks the same
// on every phone instead of depending on what the phone happens to have.
const arabic = Noto_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
});

// Tells Next.js which languages exist, so each page can be built in advance.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Every page title ends with the product name: "Log in · Pagerly".
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common");
  return { title: { template: `%s · ${t("brand")}`, default: t("brand") } };
}

export default async function RootLayout({
  children,
}: LayoutProps<"/[locale]">) {
  const locale = await localeFromUrl();
  if (!hasLocale(routing.locales, locale)) notFound();

  return (
    <html
      lang={locale}
      dir={directionOf(locale)}
      className={`${geistSans.variable} ${geistMono.variable} ${arabic.variable}`}
    >
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
