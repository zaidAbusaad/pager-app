import { describe, expect, it } from "vitest";
import { PLANS, YEARLY_SAVING, whatsappLink } from "./plans";

describe("plans", () => {
  it("the yearly plan is cheaper than twelve monthly payments", () => {
    expect(PLANS.yearlyPrice).toBeLessThan(PLANS.monthlyPrice * 12);
    expect(YEARLY_SAVING).toBe(90);
  });

  it("builds a WhatsApp link with digits only", () => {
    expect(whatsappLink()).toBe("https://wa.me/962799016101");
    expect(whatsappLink("Hi there")).toBe("https://wa.me/962799016101?text=Hi%20there");
  });
});
