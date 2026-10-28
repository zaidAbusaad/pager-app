// What we sell, in one place. The website reads these numbers, so a price
// change is a one-line edit here (and the text in messages/*.json stays
// untouched because it only holds the words, not the amounts).
export const PLANS = {
  currency: "JD",
  monthlyPrice: 20,
  yearlyPrice: 150,
  freeMonths: 1, // the first month is free on the monthly plan
} as const;

// What a year of the monthly plan would cost, minus the yearly price.
export const YEARLY_SAVING = PLANS.monthlyPrice * 12 - PLANS.yearlyPrice;

// Jordan mobile 0799016101 written the international way (wa.me needs digits only).
export const WHATSAPP_NUMBER = "962799016101";
export const WHATSAPP_DISPLAY = "0799 016 101";

export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
