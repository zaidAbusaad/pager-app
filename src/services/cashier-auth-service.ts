import { hashCashierToken } from "@/domain/cashier-token";
import { DomainError } from "@/domain/errors";
import type { Shop } from "@/domain/shop";
import type { ShopRepository } from "@/repositories/shop-repository";

const MAX_TOKEN_LENGTH = 200; // real tokens are 43 chars; refuse absurd input early

export function createCashierAuthService({ shops }: { shops: ShopRepository }) {
  return {
    // Turns the secret from a cashier link into the shop it belongs to.
    // Every failure looks the same on purpose, so attackers learn nothing.
    async authenticate(token: string | null | undefined): Promise<Shop> {
      const deny = () =>
        new DomainError("UNAUTHORIZED", "Invalid or missing cashier link");

      if (!token || token.length > MAX_TOKEN_LENGTH) throw deny();

      const shop = await shops.findByCashierTokenHash(hashCashierToken(token));
      if (!shop) throw deny();
      return shop;
    },
  };
}

export type CashierAuthService = ReturnType<typeof createCashierAuthService>;
