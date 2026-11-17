export interface Shop {
  id: string;
  name: string;
  slug: string;
}

// A shop together with the subscription of the owner it belongs to. `owner`
// is null for shops that have no owner (the demo shop): those are never
// blocked.
export interface ShopWithOwner extends Shop {
  owner: { activeUntil: Date | null } | null;
}

export const MAX_SHOP_NAME_LENGTH = 60;
// A safety cap, not a pricing rule: stops one account from creating
// thousands of branches. Raise it per customer later if needed.
export const MAX_BRANCHES_PER_OWNER = 20;

export function normalizeShopName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function isValidShopName(name: string): boolean {
  return name.length >= 1 && name.length <= MAX_SHOP_NAME_LENGTH;
}

// "Café Al-Wadi #2" -> "cafe-al-wadi-2". The slug is the readable part of the
// customer QR link (/s/cafe-al-wadi-2). Names with no Latin letters or digits
// (Arabic names, for example) give "" and the caller adds a random suffix.
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // drop accents: é -> e
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/g, "");
}
