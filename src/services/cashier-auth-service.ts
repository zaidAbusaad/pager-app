import { hashCashierToken } from "@/domain/cashier-token";
import { DomainError } from "@/domain/errors";
import type { Shop } from "@/domain/shop";
import { canUseService, subscriptionState } from "@/domain/subscription";
import type { ShopRepository } from "@/repositories/shop-repository";

const MAX_TOKEN_LENGTH = 200; // real tokens are 43 chars; refuse absurd input early

interface Deps {
  shops: ShopRepository;
  now?: () => Date; // injectable so tests control the clock
}

export function createCashierAuthService({ shops, now = () => new Date() }: Deps) {
  return {
    // Turns the secret from a cashier link into the shop it belongs to.
    // Every failure of the LINK looks the same on purpose, so attackers learn
    // nothing. Only someone who holds a valid link can see the second kind of
    // refusal, SUBSCRIPTION_INACTIVE: the link is fine, but the owner's
    // account is not activated or has expired (see domain/subscription.ts).
    async authenticate(token: string | null | undefined): Promise<Shop> {
      const deny = () =>
        new DomainError("UNAUTHORIZED", "Invalid or missing cashier link");

      if (!token || token.length > MAX_TOKEN_LENGTH) throw deny();

      const found = await shops.findByCashierTokenHash(hashCashierToken(token));
      if (!found) throw deny();

      // Shops without an owner (the demo shop) are never blocked.
      const { owner, ...shop } = found;
      if (owner && !canUseService(subscriptionState(owner.activeUntil, now()))) {
        throw new DomainError(
          "SUBSCRIPTION_INACTIVE",
          "This shop's subscription is not active",
        );
      }
      return shop;
    },
  };
}

export type CashierAuthService = ReturnType<typeof createCashierAuthService>;
