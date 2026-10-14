/**
 * Permission codes the backend actually enforces. Mirrors the Django catalogue
 * (realhrsoft-marketplace-rest-api permissions/catalogue.py): add a code here only once a
 * backend handler checks it. The UI keys off these codes, never off role names or actor_type.
 *
 * Every code has one scope (ADR-014). Global codes come only from platform-wide grants;
 * organization codes come only from a grant in the organization selected with
 * X-Organization-ID (directly, or through a client role of its client); client codes only
 * from a client role in the client selected with X-Client-ID. No kind ever satisfies a check
 * of another kind.
 */
export const IdentityPermission = {
  USER_VIEW: "identity.user.view",
  USER_CREATE: "identity.user.create",
  USER_DISABLE: "identity.user.disable",
  USER_REACTIVATE: "identity.user.reactivate",
  /** Emails a new set-password link to an account that has not set a password yet. */
  USER_PASSWORD_SETUP_RESEND: "identity.user.password_setup.resend",
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
 * Global: every organization's enquiries about business (B2B) offers (/admin/business-enquiries).
 * Administrators moderate business offers themselves with the OfferAdminPermission codes.
 */
export const BusinessAdminPermission = {
  ENQUIRY_VIEW: "offers.business_enquiry.view",
} as const;

/**
 * Organization: the Business portal (/business), for a merchant acting through its home
 * organization; the merchant must be verified. Its own business offers, the catalogue of other
 * businesses' offers (merchants and client groups), the enquiries it sent and the enquiries
 * (leads) it received. A client group holds the same authority as ClientBusinessPermission.
 */
export const BusinessOfferPermission = {
  OFFER_VIEW: "offers.own_business_offer.view",
  OFFER_CREATE: "offers.own_business_offer.create",
  OFFER_UPDATE: "offers.own_business_offer.update",
  OFFER_SUBMIT: "offers.own_business_offer.submit",
  /** Retracts a version under review and unpublishes the live one. */
  OFFER_WITHDRAW: "offers.own_business_offer.withdraw",
  /** Pauses and resumes. */
  OFFER_PAUSE: "offers.own_business_offer.pause",
  OFFER_RETIRE: "offers.own_business_offer.retire",
  CATALOGUE_VIEW: "offers.business_catalogue.view",
  SENT_ENQUIRY_VIEW: "offers.sent_enquiry.view",
  SENT_ENQUIRY_CREATE: "offers.sent_enquiry.create",
  RECEIVED_ENQUIRY_VIEW: "offers.received_enquiry.view",
  /** Closes a received enquiry once followed up. */
  RECEIVED_ENQUIRY_MANAGE: "offers.received_enquiry.manage",
} as const;

/**
 * Global: employments synchronized from RealHRSoft (/admin/employments), read-only. Employees
 * are RealHRSoft identities, not Marketplace users; RealHRSoft owns their employment.
 */
export const EmploymentAdminPermission = {
  EMPLOYMENT_VIEW: "employee_access.employment.view",
} as const;

/**
 * Global: the RealHRSoft integration. Sync status, reconciliation and redrive of stuck events
 * (/integrations/realhrsoft/*), and emergency blocks on employee access
 * (/admin/employee-access/denials).
 */
export const IntegrationAdminPermission = {
  SYNC_VIEW: "identity.realhrsoft_sync.view",
  SYNC_RECONCILE: "identity.realhrsoft_sync.reconcile",
  SYNC_REDRIVE: "identity.realhrsoft_sync.redrive",
  EMPLOYEE_ACCESS_DENY: "identity.employee_access.deny",
} as const;

/** Global: rollout switches (/admin/feature-flags). */
export const FeatureFlagAdminPermission = {
  FLAG_VIEW: "core.feature_flag.view",
  FLAG_MANAGE: "core.feature_flag.manage",
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

/**
 * Global: Aayulogic administration of advertising (the Marketing module): campaigns and
 * advertisements on a partner's behalf, the review queue, suspension, the placement slot
 * catalogue and the advertising grants that make an organization eligible to advertise.
 */
export const MarketingAdminPermission = {
  CAMPAIGN_VIEW: "marketing.campaign.view",
  CAMPAIGN_MANAGE: "marketing.campaign.manage",
  /** Advertisements, their revisions, decisions and creative assets (incl. the queue). */
  AD_VIEW: "marketing.ad.view",
  /** Creates, edits, submits and retracts on behalf, and uploads assets for a partner. */
  AD_MANAGE: "marketing.ad.manage",
  AD_REVIEW: "marketing.ad.review",
  AD_SUSPEND: "marketing.ad.suspend",
  SLOT_VIEW: "marketing.slot.view",
  SLOT_MANAGE: "marketing.slot.manage",
  GRANT_VIEW: "marketing.grant.view",
  GRANT_MANAGE: "marketing.grant.manage",
} as const;

/**
 * Organization: the selected partner's own campaigns (/partner/campaigns) and advertisements
 * (/partner/advertisements). Viewing campaigns also shows the organization's advertising
 * grants; viewing advertisements also lists creative assets and targetable slots.
 */
export const PartnerMarketingPermission = {
  CAMPAIGN_VIEW: "marketing.own_campaign.view",
  /** Creates, edits, pauses, resumes and archives campaigns. */
  CAMPAIGN_MANAGE: "marketing.own_campaign.manage",
  AD_VIEW: "marketing.own_ad.view",
  /** Creates, edits, pauses, resumes and archives advertisements and uploads assets. */
  AD_MANAGE: "marketing.own_ad.manage",
  /** Sends revisions for review and retracts them. */
  AD_SUBMIT: "marketing.own_ad.submit",
} as const;

/**
 * Client: held through a client role in the client selected with X-Client-ID (the Client
 * portal). A client is a RealHRSoft group: a Partner and every one of its companies.
 */
export const ClientBenefitPermission = {
  BENEFIT_VIEW: "offers.client_benefit.view",
  BENEFIT_CREATE: "offers.client_benefit.create",
  BENEFIT_UPDATE: "offers.client_benefit.update",
  /** Publishes a draft and unpublishes the live version. */
  BENEFIT_PUBLISH: "offers.client_benefit.publish",
  /** Pauses and resumes. */
  BENEFIT_PAUSE: "offers.client_benefit.pause",
  BENEFIT_RETIRE: "offers.client_benefit.retire",
} as const;

/**
 * Client: business (B2B) offers acting as the client group (/client/business, X-Client-ID).
 * Each is the client equivalent of a BusinessOfferPermission code (CLIENT_BUSINESS_CODES).
 * A client's own offers are enquiry-only: never shown to employees.
 */
export const ClientBusinessPermission = {
  OFFER_VIEW: "offers.client_business_offer.view",
  OFFER_CREATE: "offers.client_business_offer.create",
  OFFER_UPDATE: "offers.client_business_offer.update",
  OFFER_SUBMIT: "offers.client_business_offer.submit",
  OFFER_WITHDRAW: "offers.client_business_offer.withdraw",
  OFFER_PAUSE: "offers.client_business_offer.pause",
  OFFER_RETIRE: "offers.client_business_offer.retire",
  CATALOGUE_VIEW: "offers.client_business_catalogue.view",
  SENT_ENQUIRY_VIEW: "offers.client_sent_enquiry.view",
  SENT_ENQUIRY_CREATE: "offers.client_sent_enquiry.create",
  RECEIVED_ENQUIRY_VIEW: "offers.client_received_enquiry.view",
  RECEIVED_ENQUIRY_MANAGE: "offers.client_received_enquiry.manage",
} as const;

/** The client code for each merchant business code: one authority, two scopes. */
export const CLIENT_BUSINESS_CODES: Readonly<
  Record<ValueOf<typeof BusinessOfferPermission>, ValueOf<typeof ClientBusinessPermission>>
> = {
  [BusinessOfferPermission.OFFER_VIEW]: ClientBusinessPermission.OFFER_VIEW,
  [BusinessOfferPermission.OFFER_CREATE]: ClientBusinessPermission.OFFER_CREATE,
  [BusinessOfferPermission.OFFER_UPDATE]: ClientBusinessPermission.OFFER_UPDATE,
  [BusinessOfferPermission.OFFER_SUBMIT]: ClientBusinessPermission.OFFER_SUBMIT,
  [BusinessOfferPermission.OFFER_WITHDRAW]: ClientBusinessPermission.OFFER_WITHDRAW,
  [BusinessOfferPermission.OFFER_PAUSE]: ClientBusinessPermission.OFFER_PAUSE,
  [BusinessOfferPermission.OFFER_RETIRE]: ClientBusinessPermission.OFFER_RETIRE,
  [BusinessOfferPermission.CATALOGUE_VIEW]: ClientBusinessPermission.CATALOGUE_VIEW,
  [BusinessOfferPermission.SENT_ENQUIRY_VIEW]: ClientBusinessPermission.SENT_ENQUIRY_VIEW,
  [BusinessOfferPermission.SENT_ENQUIRY_CREATE]: ClientBusinessPermission.SENT_ENQUIRY_CREATE,
  [BusinessOfferPermission.RECEIVED_ENQUIRY_VIEW]: ClientBusinessPermission.RECEIVED_ENQUIRY_VIEW,
  [BusinessOfferPermission.RECEIVED_ENQUIRY_MANAGE]:
    ClientBusinessPermission.RECEIVED_ENQUIRY_MANAGE,
};

/** Client: usage of the client's benefits, in total and per company, as counts. */
export const ClientAnalyticsPermission = {
  BENEFIT_REPORT_VIEW: "analytics.client_benefit_report.view",
} as const;

/** Client: the client's own members and client roles (/client/members, /client/roles). */
export const ClientAdministrationPermission = {
  MEMBER_MANAGE: "partners.client_member.manage",
  ROLE_MANAGE: "partners.client_role.manage",
  /** Adds, lists and ends each company's users (a few per company) and resends their links. */
  COMPANY_USER_MANAGE: "partners.company_user.manage",
} as const;

type ValueOf<T> = T[keyof T];

export type IdentityPermissionCode = ValueOf<typeof IdentityPermission>;
export type GlobalPermissionCode =
  | IdentityPermissionCode
  | ValueOf<typeof OrganizationAdminPermission>
  | ValueOf<typeof PartnerAdminPermission>
  | ValueOf<typeof OfferAdminPermission>
  | ValueOf<typeof BusinessAdminPermission>
  | ValueOf<typeof EmploymentAdminPermission>
  | ValueOf<typeof ClaimAdminPermission>
  | ValueOf<typeof AnalyticsAdminPermission>
  | ValueOf<typeof BenefitAdminPermission>
  | ValueOf<typeof RedemptionAdminPermission>
  | ValueOf<typeof MarketingAdminPermission>
  | ValueOf<typeof IntegrationAdminPermission>
  | ValueOf<typeof FeatureFlagAdminPermission>;
export type OrganizationPermissionCode =
  | ValueOf<typeof PartnerPermission>
  | ValueOf<typeof PartnerOfferPermission>
  | ValueOf<typeof BusinessOfferPermission>
  | ValueOf<typeof PartnerClaimPermission>
  | ValueOf<typeof PartnerAnalyticsPermission>
  | ValueOf<typeof EmployerBenefitPermission>
  | ValueOf<typeof EmployerAnalyticsPermission>
  | ValueOf<typeof PartnerRedemptionPermission>
  | ValueOf<typeof PartnerMarketingPermission>;
export type ClientPermissionCode =
  | ValueOf<typeof ClientBenefitPermission>
  | ValueOf<typeof ClientBusinessPermission>
  | ValueOf<typeof ClientAnalyticsPermission>
  | ValueOf<typeof ClientAdministrationPermission>;
export type PermissionCode =
  GlobalPermissionCode | OrganizationPermissionCode | ClientPermissionCode;

/** Every administrative global code: holding any of them opens the admin console. */
export const GLOBAL_PERMISSIONS: readonly GlobalPermissionCode[] = [
  ...Object.values(IdentityPermission),
  ...Object.values(OrganizationAdminPermission),
  ...Object.values(PartnerAdminPermission),
  ...Object.values(OfferAdminPermission),
  ...Object.values(BusinessAdminPermission),
  ...Object.values(EmploymentAdminPermission),
  ...Object.values(ClaimAdminPermission),
  ...Object.values(AnalyticsAdminPermission),
  ...Object.values(BenefitAdminPermission),
  ...Object.values(RedemptionAdminPermission),
  ...Object.values(MarketingAdminPermission),
  ...Object.values(IntegrationAdminPermission),
  ...Object.values(FeatureFlagAdminPermission),
];

/** Every client code: holding any of them in some client opens the Client portal. */
export const CLIENT_PERMISSIONS: readonly ClientPermissionCode[] = [
  ...Object.values(ClientBenefitPermission),
  ...Object.values(ClientBusinessPermission),
  ...Object.values(ClientAnalyticsPermission),
  ...Object.values(ClientAdministrationPermission),
];
