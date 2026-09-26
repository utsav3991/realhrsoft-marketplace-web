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
  /** Turns an organization's Employer capacity on or off (/admin/organizations/{id}/employer). */
  EMPLOYER_MANAGE: "organizations.employer.manage",
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

/**
 * Global: Aayulogic administration of offer categories (/admin/offer-categories) and of every
 * partner's offers (/admin/offers), including publishing on a partner's behalf.
 */
export const OfferAdminPermission = {
  CATEGORY_VIEW: "offers.category.view",
  CATEGORY_CREATE: "offers.category.create",
  CATEGORY_UPDATE: "offers.category.update",
  CATEGORY_RETIRE: "offers.category.retire",
  CATEGORY_REACTIVATE: "offers.category.reactivate",
  OFFER_VIEW: "offers.offer.view",
  OFFER_CREATE: "offers.offer.create",
  OFFER_UPDATE: "offers.offer.update",
  OFFER_SUBMIT: "offers.offer.submit",
  OFFER_PUBLISH: "offers.offer.publish",
  OFFER_APPROVE: "offers.offer.approve",
  OFFER_REJECT: "offers.offer.reject",
  OFFER_REQUEST_CHANGES: "offers.offer.request_changes",
  OFFER_WITHDRAW: "offers.offer.withdraw",
  OFFER_SUSPEND: "offers.offer.suspend",
  OFFER_REINSTATE: "offers.offer.reinstate",
  OFFER_FEATURE: "offers.offer.feature",
  OFFER_DECISION_VIEW: "offers.offer_decision.view",
} as const;

/** Organization: the selected partner organization's own offers (/partner/offers). */
export const PartnerOfferPermission = {
  OFFER_VIEW: "offers.partner_offer.view",
  OFFER_CREATE: "offers.partner_offer.create",
  OFFER_UPDATE: "offers.partner_offer.update",
  OFFER_SUBMIT: "offers.partner_offer.submit",
  /** Retracts a version under review and unpublishes the live one. */
  OFFER_WITHDRAW: "offers.partner_offer.withdraw",
  /** Pauses and resumes. */
  OFFER_PAUSE: "offers.partner_offer.pause",
  OFFER_RETIRE: "offers.partner_offer.retire",
  OFFER_DECISION_VIEW: "offers.partner_offer_decision.view",
} as const;

/**
 * Global: interim employee eligibility (/admin/employments). An employee may use the
 * marketplace only while an administrator-recorded employment is current.
 */
export const EmploymentAdminPermission = {
  EMPLOYMENT_VIEW: "employee_access.employment.view",
  EMPLOYMENT_CREATE: "employee_access.employment.create",
  EMPLOYMENT_END: "employee_access.employment.end",
} as const;

/**
 * Global: every claim of both kinds (/admin/claims), and deciding a pending one on a partner's
 * behalf. Accepting a claim is not confirming its use: that is a redemption permission.
 */
export const ClaimAdminPermission = {
  CLAIM_VIEW: "offers.claim.view",
  CLAIM_ACCEPT: "offers.claim.accept",
  CLAIM_REJECT: "offers.claim.reject",
} as const;

/**
 * Organization: claims of the selected partner organization's offers (/partner/claims) and the
 * decision queue of offers that need partner approval. Employees need no code to claim.
 */
export const PartnerClaimPermission = {
  CLAIM_VIEW: "offers.partner_claim.view",
  CLAIM_ACCEPT: "offers.partner_claim.accept",
  CLAIM_REJECT: "offers.partner_claim.reject",
} as const;

/** Global: marketplace-wide offer performance (/admin/reports), incl. the employer breakdown. */
export const AnalyticsAdminPermission = {
  OFFER_REPORT_VIEW: "analytics.offer_report.view",
} as const;

/** Organization: the selected partner's own offer performance (/partner/analytics), as totals. */
export const PartnerAnalyticsPermission = {
  OFFER_REPORT_VIEW: "analytics.partner_offer_report.view",
} as const;

/** Global: moderation of every employer's Company Benefits (/admin/company-benefits). */
export const BenefitAdminPermission = {
  BENEFIT_VIEW: "offers.benefit.view",
  BENEFIT_SUSPEND: "offers.benefit.suspend",
} as const;

/**
 * Organization: the selected employer's own Company Benefits (/employer/benefits). Every code
 * also needs the organization's Employer capacity; employees need no code to claim.
 */
export const EmployerBenefitPermission = {
  BENEFIT_VIEW: "offers.own_benefit.view",
  BENEFIT_CREATE: "offers.own_benefit.create",
  BENEFIT_UPDATE: "offers.own_benefit.update",
  /** Publishes a draft and unpublishes the live version. */
  BENEFIT_PUBLISH: "offers.own_benefit.publish",
  /** Pauses and resumes. */
  BENEFIT_PAUSE: "offers.own_benefit.pause",
  BENEFIT_RETIRE: "offers.own_benefit.retire",
} as const;

/** Organization: the selected employer's benefit usage (/employer/reports), as counts. */
export const EmployerAnalyticsPermission = {
  BENEFIT_REPORT_VIEW: "analytics.benefit_report.view",
} as const;

/**
 * Global: Aayulogic oversight of vouchers (/admin/vouchers), their confirmed uses
 * (/admin/redemptions) and emergency redemption blocks (/admin/redemption-blocks).
 */
export const RedemptionAdminPermission = {
  VOUCHER_VIEW: "redemptions.voucher.view",
  /** Confirms a use on the partner's behalf, with an audited reason. */
  VOUCHER_CONFIRM: "redemptions.voucher.confirm",
  VOUCHER_REVOKE: "redemptions.voucher.revoke",
  REDEMPTION_VIEW: "redemptions.redemption.view",
  REDEMPTION_REVERSE: "redemptions.redemption.reverse",
  BLOCK_VIEW: "redemptions.block.view",
  BLOCK_ACTIVATE: "redemptions.block.activate",
  BLOCK_CLEAR: "redemptions.block.clear",
} as const;

/**
 * Organization: the selected partner's counter (/partner/redeem) and receipts
 * (/partner/redemptions). Validating and confirming are separate from accepting a claim.
 */
export const PartnerRedemptionPermission = {
  VOUCHER_VALIDATE: "redemptions.partner_voucher.validate",
  VOUCHER_CONFIRM: "redemptions.partner_voucher.confirm",
  REDEMPTION_VIEW: "redemptions.partner_redemption.view",
} as const;

type ValueOf<T> = T[keyof T];

export type IdentityPermissionCode = ValueOf<typeof IdentityPermission>;
export type GlobalPermissionCode =
  | IdentityPermissionCode
  | ValueOf<typeof OrganizationAdminPermission>
  | ValueOf<typeof PartnerAdminPermission>
  | ValueOf<typeof OfferAdminPermission>
  | ValueOf<typeof EmploymentAdminPermission>
  | ValueOf<typeof ClaimAdminPermission>
  | ValueOf<typeof AnalyticsAdminPermission>
  | ValueOf<typeof BenefitAdminPermission>
  | ValueOf<typeof RedemptionAdminPermission>;
export type OrganizationPermissionCode =
  | ValueOf<typeof PartnerPermission>
  | ValueOf<typeof PartnerOfferPermission>
  | ValueOf<typeof PartnerClaimPermission>
  | ValueOf<typeof PartnerAnalyticsPermission>
  | ValueOf<typeof EmployerBenefitPermission>
  | ValueOf<typeof EmployerAnalyticsPermission>
  | ValueOf<typeof PartnerRedemptionPermission>;
export type PermissionCode = GlobalPermissionCode | OrganizationPermissionCode;

/** Every administrative global code: holding any of them opens the admin console. */
export const GLOBAL_PERMISSIONS: readonly GlobalPermissionCode[] = [
  ...Object.values(IdentityPermission),
  ...Object.values(OrganizationAdminPermission),
  ...Object.values(PartnerAdminPermission),
  ...Object.values(OfferAdminPermission),
  ...Object.values(EmploymentAdminPermission),
  ...Object.values(ClaimAdminPermission),
  ...Object.values(AnalyticsAdminPermission),
  ...Object.values(BenefitAdminPermission),
  ...Object.values(RedemptionAdminPermission),
];
