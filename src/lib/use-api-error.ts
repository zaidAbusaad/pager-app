"use client";

import { useTranslations } from "next-intl";

// What our API sends back when something fails (see lib/http.ts).
export interface ApiErrorBody {
  reason?: string;
  number?: number;
}

// Turns an API error into a sentence in the visitor's language. The server
// sends a stable `reason`; the texts for each reason live in messages/*.json.
export function useApiErrorMessage() {
  const t = useTranslations("errors");

  return function message(body: ApiErrorBody | null): string {
    const number = String(body?.number ?? "");
    switch (body?.reason) {
      case "NUMBER_IN_USE":
        return t("NUMBER_IN_USE", { number });
      case "ORDER_CHANGED":
        return t("ORDER_CHANGED");
      case "REOPEN_NUMBER_TAKEN":
        return t("REOPEN_NUMBER_TAKEN", { number });
      case "ONLY_PENDING_CANCEL":
        return t("ONLY_PENDING_CANCEL");
      case "INVALID_TRANSITION":
        return t("INVALID_TRANSITION");
      case "ORDER_NOT_FOUND":
        return t("ORDER_NOT_FOUND");
      case "SHOP_NOT_FOUND":
        return t("SHOP_NOT_FOUND");
      case "NOTHING_TO_CLAIM":
        return t("NOTHING_TO_CLAIM");
      case "NO_OPEN_ORDER":
        return t("NO_OPEN_ORDER", { number });
      case "ALREADY_CLAIMED":
        return t("ALREADY_CLAIMED", { number });
      case "ALREADY_COLLECTED":
        return t("ALREADY_COLLECTED");
      case "INVALID_EMAIL":
        return t("INVALID_EMAIL");
      case "WEAK_PASSWORD":
        return t("WEAK_PASSWORD");
      case "EMAIL_TAKEN":
        return t("EMAIL_TAKEN");
      case "INVALID_CREDENTIALS":
        return t("INVALID_CREDENTIALS");
      case "UNAUTHORIZED":
        return t("UNAUTHORIZED");
      case "INVALID_NAME":
        return t("INVALID_NAME");
      case "TOO_MANY_BRANCHES":
        return t("TOO_MANY_BRANCHES");
      case "SLUG_UNAVAILABLE":
        return t("SLUG_UNAVAILABLE");
      case "BRANCH_NOT_FOUND":
        return t("BRANCH_NOT_FOUND");
      default:
        return t("generic");
    }
  };
}

export function useOfflineMessage() {
  const t = useTranslations("errors");
  return () => t("offline");
}
