import type { Locale } from "@/i18n/routing";
import messages from "../messages/en.json";

// Teaches TypeScript the exact shape of our texts, so a typo such as
// t("cashier.newOrdr") is a compile error instead of a blank on screen.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
