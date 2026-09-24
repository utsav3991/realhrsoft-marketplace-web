/**
 * Permission codes the backend actually enforces. Mirrors each context's
 * application/catalogue.py: add a code here only once a backend handler checks it. The UI
 * keys off these codes, never off role names or actor_type.
 *
 * Every code has one scope (ADR-014). Global codes come only from platform-wide grants;
 * organization codes come only from a grant in the organization selected with
 * X-Organization-ID. Neither kind ever satisfies a check of the other kind.
 */
export const IdentityPermission = {
  USER_VIEW: "identity.user.view",
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

/** Global: Aayulogic administration of organizations, membership and Partner onboarding. */
export const OrganizationAdminPermission = {
  ORGANIZATION_VIEW: "organizations.organization.view",
  ORGANIZATION_MANAGE: "organizations.organization.manage",
  MEMBERSHIP_MANAGE: "organizations.membership.manage",
  APPLICATION_VIEW: "organizations.partner_application.view",
  APPLICATION_CREATE: "organizations.partner_application.create",
  APPLICATION_REVIEW: "organizations.partner_application.review",
  PARTNER_MANAGE: "organizations.partner_profile.manage",
  ENTITLEMENT_MANAGE: "commercial.entitlement.manage",
  OFFER_REVIEW: "offers.offer.review",
} as const;

/** Organization: the Employer portal. */
export const EmployerPermission = {
  PROFILE_VIEW: "organizations.employer_profile.view",
  BENEFIT_VIEW: "employer_benefits.benefit.view",
  BENEFIT_CREATE: "employer_benefits.benefit.create",
  BENEFIT_EDIT: "employer_benefits.benefit.edit",
  BENEFIT_PUBLISH: "employer_benefits.benefit.publish",
  BENEFIT_RETIRE: "employer_benefits.benefit.retire",
} as const;

/** Organization: the Partner portal. */
export const PartnerPermission = {
  PROFILE_VIEW: "organizations.partner_profile.view",
  PROFILE_EDIT: "organizations.partner_profile.edit",
  ENTITLEMENT_VIEW: "commercial.entitlement.view",
  OFFER_VIEW: "offers.offer.view",
  OFFER_CREATE: "offers.offer.create",
  OFFER_EDIT: "offers.offer.edit",
  OFFER_SUBMIT: "offers.offer.submit",
  OFFER_WITHDRAW: "offers.offer.withdraw",
} as const;

type ValueOf<T> = T[keyof T];

export type IdentityPermissionCode = ValueOf<typeof IdentityPermission>;
export type GlobalPermissionCode =
  IdentityPermissionCode | ValueOf<typeof OrganizationAdminPermission>;
export type OrganizationPermissionCode =
  ValueOf<typeof EmployerPermission> | ValueOf<typeof PartnerPermission>;
export type PermissionCode = GlobalPermissionCode | OrganizationPermissionCode;

/** Every global code: holding any of them opens the admin console. */
export const GLOBAL_PERMISSIONS: readonly GlobalPermissionCode[] = [
  ...Object.values(IdentityPermission),
  ...Object.values(OrganizationAdminPermission),
];
