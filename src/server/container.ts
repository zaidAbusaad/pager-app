import { PrismaOwnerRepository, PrismaSessionRepository } from "@/repositories/prisma-owner-repository";
import { PrismaOwnerShopRepository } from "@/repositories/prisma-owner-shop-repository";
import { PrismaStatsRepository } from "@/repositories/prisma-stats-repository";
import { PrismaOrderRepository } from "@/repositories/prisma-order-repository";
import { PrismaShopRepository } from "@/repositories/prisma-shop-repository";
import { createBranchService } from "@/services/branch-service";
import { createCashierAuthService } from "@/services/cashier-auth-service";
import { createCustomerService } from "@/services/customer-service";
import { createOrderService } from "@/services/order-service";
import { createStatsService } from "@/services/stats-service";
import { createOwnerAuthService } from "@/services/owner-auth-service";

// The one place where real implementations are wired together.
const orderRepository = new PrismaOrderRepository();
const shopRepository = new PrismaShopRepository();

export const orderService = createOrderService({ orders: orderRepository });

export const cashierAuth = createCashierAuthService({ shops: shopRepository });

export const customerService = createCustomerService({
  shops: shopRepository,
  orders: orderRepository,
});

export const ownerAuth = createOwnerAuthService({
  owners: new PrismaOwnerRepository(),
  sessions: new PrismaSessionRepository(),
});

const ownerShops = new PrismaOwnerShopRepository();

export const branchService = createBranchService({ shops: ownerShops });

export const statsService = createStatsService({
  branches: ownerShops,
  stats: new PrismaStatsRepository(),
});
