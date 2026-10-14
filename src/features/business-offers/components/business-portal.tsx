"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import { useSelectedClientId, useSelectedOrganizationId } from "@/shared/auth";
import {
  BusinessOfferPermission,
  CLIENT_BUSINESS_CODES,
  useCanInClient,
  useCanInOrganization,
} from "@/shared/authorization";
import { RequireClient } from "@/shared/navigation/client-scope";
import { RequireOrganization } from "@/shared/navigation/organization-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

import type { BusinessOwner } from "../api/queries";

type BusinessCode = (typeof BusinessOfferPermission)[keyof typeof BusinessOfferPermission];

/**
 * Which business portal a screen is in. A merchant acts through its home organization in the
 * Business portal (/business); a client group in the Client portal (/client/business). The
 * screens are the same; only the scope, the paths and the permission codes differ.
 */
export type BusinessPortalKind = "merchant" | "client";

interface BusinessPortalValue {
  kind: BusinessPortalKind;
  owner: BusinessOwner;
  /** Where this portal's business screens live. */
  base: "/business" | "/client/business";
}

const BusinessPortalContext = createContext<BusinessPortalValue | null>(null);

/** The portal, or null on screens shared with administration (outside <BusinessPage>). */
export function useOptionalBusinessPortal(): BusinessPortalValue | null {
  return useContext(BusinessPortalContext);
}

export function useBusinessPortal(): BusinessPortalValue {
  const value = useContext(BusinessPortalContext);
  if (!value) throw new Error("useBusinessPortal needs <BusinessPage>");
  return value;
}

/** A merchant code checked in this portal: as is for a merchant, its client twin for a client. */
export function useBusinessCan(code: BusinessCode): boolean {
  const { kind } = useBusinessPortal();
  const inOrganization = useCanInOrganization(code);
  const inClient = useCanInClient(CLIENT_BUSINESS_CODES[code]);
  return kind === "client" ? inClient : inOrganization;
}

function MerchantPortal({ children }: { children: ReactNode }) {
  const organizationId = useSelectedOrganizationId();
  const value = useMemo<BusinessPortalValue>(
    () => ({
      kind: "merchant",
      owner: { kind: "organization", id: organizationId },
      base: "/business",
    }),
    [organizationId],
  );
  return <BusinessPortalContext.Provider value={value}>{children}</BusinessPortalContext.Provider>;
}

function ClientPortal({ children }: { children: ReactNode }) {
  const clientId = useSelectedClientId();
  const value = useMemo<BusinessPortalValue>(
    () => ({ kind: "client", owner: { kind: "client", id: clientId }, base: "/client/business" }),
    [clientId],
  );
  return <BusinessPortalContext.Provider value={value}>{children}</BusinessPortalContext.Provider>;
}

/**
 * A business screen: selects the scope (the merchant's organization or the client), checks the
 * page's permission there (as a merchant code; clients need its twin) and provides the portal.
 */
export function BusinessPage({
  portal,
  permission,
  children,
}: {
  portal: BusinessPortalKind;
  permission?: BusinessCode;
  children: ReactNode;
}) {
  if (portal === "client") {
    const page = <ClientPortal>{children}</ClientPortal>;
    return (
      <RequireClient>
        {permission ? (
          <RequirePermission anyOf={[CLIENT_BUSINESS_CODES[permission]]} inClient>
            {page}
          </RequirePermission>
        ) : (
          page
        )}
      </RequireClient>
    );
  }
  const page = <MerchantPortal>{children}</MerchantPortal>;
  return (
    <RequireOrganization capacity="partner">
      {permission ? (
        <RequirePermission anyOf={[permission]} inOrganization>
          {page}
        </RequirePermission>
      ) : (
        page
      )}
    </RequireOrganization>
  );
}
