"use client";

import { useMemo } from "react";

import { useSelectedOrganizationId } from "@/shared/auth";
import {
  MarketingAdminPermission,
  PartnerMarketingPermission,
  useCan,
  useCanInOrganization,
  type PermissionCode,
} from "@/shared/authorization";

import { partnerWorkspace, type PartnerWorkspace, type Workspace } from "../api/queries";

/**
 * What a workspace screen may offer, as (administrator code, portal code). Administrators act
 * on behalf with global codes; members act for the selected organization. Scopes never
 * substitute (ADR-014).
 */
const CAPABILITIES = {
  campaignView: [MarketingAdminPermission.CAMPAIGN_VIEW, PartnerMarketingPermission.CAMPAIGN_VIEW],
  campaignManage: [
    MarketingAdminPermission.CAMPAIGN_MANAGE,
    PartnerMarketingPermission.CAMPAIGN_MANAGE,
  ],
  adView: [MarketingAdminPermission.AD_VIEW, PartnerMarketingPermission.AD_VIEW],
  adManage: [MarketingAdminPermission.AD_MANAGE, PartnerMarketingPermission.AD_MANAGE],
  // Administrators submit and retract with the manage code.
  adSubmit: [MarketingAdminPermission.AD_MANAGE, PartnerMarketingPermission.AD_SUBMIT],
} as const satisfies Record<string, readonly [PermissionCode, PermissionCode]>;

export type Capability = keyof typeof CAPABILITIES;

export function useWorkspaceCan(workspace: Workspace, capability: Capability): boolean {
  const [adminCode, portalCode] = CAPABILITIES[capability];
  const admin = useCan(adminCode);
  const member = useCanInOrganization(portalCode);
  return workspace.kind === "admin" ? admin : member;
}

/** The partner portal's workspace: the selected organization. */
export function usePartnerWorkspace(): PartnerWorkspace {
  const organizationId = useSelectedOrganizationId();
  return useMemo(() => partnerWorkspace(organizationId), [organizationId]);
}
