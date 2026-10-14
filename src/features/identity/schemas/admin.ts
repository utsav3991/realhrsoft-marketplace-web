import { z } from "zod";

import { isUuid } from "@/shared/api";
import { reasonSchema } from "@/shared/forms/reason";

// Mirrors the backend request bounds; the server re-validates regardless.

export const assignRoleSchema = z
  .object({
    scope: z.enum(["global", "organization", "client"]),
    organizationId: z.string().trim(),
    clientId: z.string().trim(),
    roleId: z.string().min(1, "Choose a role"),
    reason: reasonSchema,
  })
  .refine((values) => values.scope !== "organization" || isUuid(values.organizationId), {
    path: ["organizationId"],
    message: "Enter the organization ID",
  })
  .refine((values) => values.scope !== "client" || isUuid(values.clientId), {
    path: ["clientId"],
    message: "Enter the client (partner) ID",
  });
export type AssignRoleValues = z.infer<typeof assignRoleSchema>;

export const permissionGrantSchema = z.object({ code: z.string(), delegable: z.boolean() });
export type PermissionGrantValue = z.infer<typeof permissionGrantSchema>;

export const createRoleSchema = z.object({
  scope: z.enum(["global", "organization", "client"]),
  code: z
    .string()
    .trim()
    .regex(
      /^[a-z][a-z0-9_]{2,63}$/,
      "3–64 lowercase letters, digits or underscores, starting with a letter",
    ),
  displayName: z.string().trim().min(1, "Enter a display name").max(150),
  description: z.string().trim().max(500),
  permissions: z.array(permissionGrantSchema).max(500),
  reason: reasonSchema,
});
export type CreateRoleValues = z.infer<typeof createRoleSchema>;

export const editRolePermissionsSchema = z.object({
  permissions: z.array(permissionGrantSchema).max(500),
  reason: reasonSchema,
});
export type EditRolePermissionsValues = z.infer<typeof editRolePermissionsSchema>;
