import { z } from "zod";

import { isUuid } from "@/shared/api";
import { reasonSchema } from "@/shared/forms/reason";

// Mirrors StartEmployment; the server re-validates (active employee account, one current
// employment per employee).
export const startEmploymentSchema = z.object({
  userId: z.string().refine(isUuid, "Choose the employee"),
  organizationId: z.string().refine(isUuid, "Choose the employer"),
  reason: reasonSchema,
});
export type StartEmploymentValues = z.infer<typeof startEmploymentSchema>;
