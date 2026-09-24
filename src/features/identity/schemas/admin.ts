import { z } from "zod";

// Mirrors the backend request bounds; the server re-validates regardless.
export const reasonSchema = z
  .string()
  .trim()
  .min(1, "Give a reason; it is kept in the audit log")
  .max(500, "Keep the reason under 500 characters");

export const reasonFormSchema = z.object({ reason: reasonSchema });
export type ReasonValues = z.infer<typeof reasonFormSchema>;

export const assignRoleSchema = z.object({
  roleId: z.string().min(1, "Choose a role"),
  reason: reasonSchema,
});
export type AssignRoleValues = z.infer<typeof assignRoleSchema>;

export const permissionGrantSchema = z.object({ code: z.string(), delegable: z.boolean() });
export type PermissionGrantValue = z.infer<typeof permissionGrantSchema>;

export const createRoleSchema = z.object({
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
