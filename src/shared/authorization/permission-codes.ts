/**
 * Permission codes the backend actually enforces. Mirrors the Django catalogue
 * (realhrsoft-marketplace-rest-api permissions/catalogue.py): add a code here only once a
 * backend handler checks it. The UI keys off these codes, never off role names or actor_type.
 *
 * Every code has one scope (ADR-014). Global codes come only from platform-wide grants;
 * organization codes come only from a grant in the organization selected with
 * X-Organization-ID. Neither kind ever satisfies a check of the other kind.
 */
export const IdentityPermission = {
  USER_VIEW: "identity.user.view",
  USER_CREATE: "identity.user.create",
  USER_DISABLE: "identity.user.disable",
  USER_REACTIVATE: "identity.user.reactivate",
  ROLE_VIEW: "identity.role.view",
  ROLE_CREATE: "identity.role.create",
  ROLE_PERMISSION_MANAGE: "identity.role_permission.manage",
  ROLE_ASSIGN: "identity.role.assign",
  ROLE_REVOKE: "identity.role.revoke",
  PERMISSION_VIEW: "identity.permission.view",
  ORGANIZATION_ROLE_MANAGE: "identity.organization_role.manage",
} as const;

/** Global: Aayulogic administration of organization identity and portal membership. */
export const OrganizationAdminPermission = {
  ORGANIZATION_VIEW: "organizations.organization.view",
  ORGANIZATION_MANAGE: "organizations.organization.manage",
  MEMBERSHIP_MANAGE: "organizations.membership.manage",
} as const;

/**
 * Global: Aayulogic administration of partners (/admin/partners). One code per endpoint or
 * action, so review, assisted intake and history can be delegated separately.
 */
export const PartnerAdminPermission = {
  PARTNER_VIEW: "partners.partner.view",
  PARTNER_CREATE: "partners.partner.create",
  PARTNER_UPDATE: "partners.partner.update",
  PARTNER_RESUBMIT: "partners.partner.resubmit",
  PARTNER_VERIFY: "partners.partner.verify",
  PARTNER_REJECT: "partners.partner.reject",
  PARTNER_DECISION_VIEW: "partners.partner_decision.view",
} as const;

/** Organization: the selected organization's own partner registration (/partner/me). */
export const PartnerPermission = {
  PROFILE_VIEW: "partners.profile.view",
  PROFILE_CREATE: "partners.profile.create",
  PROFILE_UPDATE: "partners.profile.update",
  PROFILE_RESUBMIT: "partners.profile.resubmit",
  PROFILE_DECISION_VIEW: "partners.profile_decision.view",
} as const;

// Employer organization codes arrive with the Django slice that enforces them.

type ValueOf<T> = T[keyof T];

export type IdentityPermissionCode = ValueOf<typeof IdentityPermission>;
export type GlobalPermissionCode =
  | IdentityPermissionCode
  | ValueOf<typeof OrganizationAdminPermission>
  | ValueOf<typeof PartnerAdminPermission>;
export type OrganizationPermissionCode = ValueOf<typeof PartnerPermission>;
export type PermissionCode = GlobalPermissionCode | OrganizationPermissionCode;

/** Every administrative global code: holding any of them opens the admin console. */
export const GLOBAL_PERMISSIONS: readonly GlobalPermissionCode[] = [
  ...Object.values(IdentityPermission),
  ...Object.values(OrganizationAdminPermission),
  ...Object.values(PartnerAdminPermission),
];
