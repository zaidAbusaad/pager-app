import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PLANS, WHATSAPP_DISPLAY, YEARLY_SAVING, whatsappLink } from "@/domain/plans";
import { LiveDemo } from "./live-demo";
import styles from "./site.module.css";

interface Item {
  title: string;
  text: string;
}

export async function Hero() {
  const t = await getTranslations("site.hero");
  return (
    <section className={styles.hero}>
      <div className={`${styles.container} ${styles.heroGrid}`}>
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>{t("eyebrow")}</p>
          <h1 className={styles.heroTitle}>{t("title")}</h1>
          <p className={styles.lead}>{t("subtitle")}</p>
          <div className={styles.ctaRow}>
            <Link href="/signup" className={styles.button}>
              {t("primary")}
            </Link>
            <a href="#demo" className={styles.buttonQuiet}>
              {t("secondary")}
            </a>
          </div>
          <p className={styles.note}>{t("note", { price: PLANS.monthlyPrice })}</p>
        </div>

        {/* A drawn phone showing the "ready" screen. Swap for a photo any time. */}
        <div className={styles.heroArt} aria-hidden>
          <div className={styles.phone}>
            <div className={styles.phoneScreen}>
              <p className={styles.phoneShop}>{t("phoneShop")}</p>
              <p className={styles.phoneNumber}>
                <bdi dir="ltr">#27</bdi>
              </p>
              <p className={styles.phoneReady}>{t("phoneReady")}</p>
              <p className={styles.phoneHint}>{t("phoneCollect")}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export async function HowItWorks() {
  const t = await getTranslations("site.how");
  const steps = t.raw("steps") as Item[];
  return (
    <section id="how" className={styles.section}>
      <div className={styles.container}>
        <h2 className={styles.h2}>{t("title")}</h2>
        <ol className={styles.steps}>
          {steps.map((step, i) => (
            <li key={step.title} className={styles.step}>
              <span className={styles.stepNumber}>{i + 1}</span>
              <h3 className={styles.h3}>{step.title}</h3>
              <p className={styles.muted}>{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export async function DemoSection() {
  const t = await getTranslations("site.demo");
  return (
    <section id="demo" className={`${styles.section} ${styles.tinted}`}>
      <div className={styles.container}>
        <h2 className={styles.h2}>{t("title")}</h2>
        <p className={styles.sectionLead}>{t("subtitle")}</p>
        <LiveDemo />
      </div>
    </section>
  );
}

export async function Features() {
  const t = await getTranslations("site.features");
  const items = t.raw("items") as Item[];
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <h2 className={styles.h2}>{t("title")}</h2>
        <ul className={styles.features}>
          {items.map((item) => (
            <li key={item.title} className={styles.feature}>
              <h3 className={styles.h3}>{item.title}</h3>
              <p className={styles.muted}>{item.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export async function Pricing() {
  const t = await getTranslations("site.pricing");
  const includes = t.raw("includes") as string[];
  return (
    <section id="pricing" className={`${styles.section} ${styles.tinted}`}>
      <div className={styles.container}>
        <h2 className={styles.h2}>{t("title")}</h2>
        <p className={styles.sectionLead}>{t("subtitle")}</p>

        <div className={styles.plans}>
          <article className={styles.plan}>
            <h3 className={styles.h3}>{t("monthly")}</h3>
            <p className={styles.price}>
              <span className={styles.amount}>{PLANS.monthlyPrice}</span> {t("perMonth")}
            </p>
            <p className={styles.badge}>{t("freeMonth")}</p>
            <PlanList items={includes} />
            <Link href="/signup" className={styles.button}>
              {t("cta")}
            </Link>
          </article>

          <article className={`${styles.plan} ${styles.planFeatured}`}>
            <h3 className={styles.h3}>{t("yearly")}</h3>
            <p className={styles.price}>
              <span className={styles.amount}>{PLANS.yearlyPrice}</span> {t("perYear")}
            </p>
            <p className={styles.badge}>{t("save", { saving: YEARLY_SAVING })}</p>
            <PlanList items={includes} />
            <Link href="/signup" className={styles.button}>
              {t("cta")}
            </Link>
          </article>
        </div>

        <p className={styles.fine}>{t("fine")}</p>
      </div>
    </section>
  );
}

function PlanList({ items }: { items: string[] }) {
  return (
    <ul className={styles.includes}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export async function Faq() {
  const t = await getTranslations("site.faq");
  const items = t.raw("items") as { q: string; a: string }[];
  const fill = (text: string) =>
    text
      .replace("{monthly}", String(PLANS.monthlyPrice))
      .replace("{yearly}", String(PLANS.yearlyPrice));
  return (
    <section id="faq" className={styles.section}>
      <div className={`${styles.container} ${styles.narrow}`}>
        <h2 className={styles.h2}>{t("title")}</h2>
        <div className={styles.faqList}>
          {items.map((item) => (
            <details key={item.q} className={styles.faqItem}>
              <summary>{item.q}</summary>
              <p className={styles.muted}>{fill(item.a)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export async function Contact() {
  const t = await getTranslations("site.contact");
  return (
    <section id="contact" className={`${styles.section} ${styles.tinted}`}>
      <div className={`${styles.container} ${styles.contact}`}>
        <h2 className={styles.h2}>{t("title")}</h2>
        <p className={styles.sectionLead}>{t("subtitle")}</p>
        <a
          className={styles.whatsapp}
          href={whatsappLink(t("message"))}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("button")}
        </a>
        <p className={styles.note}>
          <bdi dir="ltr">{WHATSAPP_DISPLAY}</bdi>
        </p>
      </div>
    </section>
  );
}

export async function SiteFooter() {
  const t = await getTranslations("site.footer");
  const common = await getTranslations("common");
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <p>
          © {common("brand")}. {t("rights")}
        </p>
      </div>
    </footer>
  );
}
