import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { SiteHeader } from "./_site/site-header";
import {
  Contact,
  DemoSection,
  Faq,
  Features,
  Hero,
  HowItWorks,
  Pricing,
  SiteFooter,
} from "./_site/sections";
import styles from "./_site/site.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return { title: t("home") };
}

// The public website: explanation, live demo, prices, FAQ and WhatsApp contact.
export default function Home() {
  return (
    <div className={styles.site}>
      <SiteHeader />
      <main>
        <Hero />
        <HowItWorks />
        <DemoSection />
        <Features />
        <Pricing />
        <Faq />
        <Contact />
      </main>
      <SiteFooter />
    </div>
  );
}
