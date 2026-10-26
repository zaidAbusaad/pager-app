import { z } from "zod";

// A slug is the URL-friendly shop name: lowercase letters, digits and dashes.
export const slugParams = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/, "Invalid shop link"),
});
