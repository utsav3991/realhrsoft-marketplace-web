import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { getActiveOrganizationId, setActiveOrganizationId } from "@/shared/api";
import { SessionContext, type CurrentActor, type Membership } from "@/shared/auth";

import { RequireOrganization } from "./organization-scope";
import { accessiblePortals, getPortal } from "./portals";

const ACME = "00000000-0000-0000-0000-00000000000a";
const GLOBEX = "00000000-0000-0000-0000-00000000000b";

function membership(organizationId: string, name: string, partner: boolean): Membership {
  return { organizationId, name, employer: !partner, partner };
}

function actor(memberships: Membership[], organizationId: string | null = null): CurrentActor {
  return {
    id: "user-1",
    actorType: "partner",
    authenticationSource: "local",
    roles: [],
    globalPermissions: new Set(),
    organization: organizationId ? { id: organizationId, permissions: new Set() } : null,
    memberships,
  };
}

function renderWith(value: CurrentActor, children: ReactNode) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <SessionContext.Provider
        value={{
          status: "authenticated",
          actor: value,
          error: null,
          login: async () => undefined,
          logout: async () => undefined,
        }}
      >
        {children}
      </SessionContext.Provider>
    </QueryClientProvider>,
  );
}

// Unmount first: a mounted <RequireOrganization> would re-select on the reset notification.
afterEach(() => {
  cleanup();
  setActiveOrganizationId(null);
});

describe("<RequireOrganization>", () => {
  it("selects the only capable organization automatically", () => {
    renderWith(
      actor([membership(ACME, "Acme", true), membership(GLOBEX, "Globex", false)]),
      <RequireOrganization capacity="partner">Portal</RequireOrganization>,
    );
    expect(getActiveOrganizationId()).toBe(ACME);
  });

  it("renders the portal once the actor was re-read for the selected organization", () => {
    setActiveOrganizationId(ACME);
    renderWith(
      actor([membership(ACME, "Acme", true)], ACME),
      <RequireOrganization capacity="partner">Portal</RequireOrganization>,
    );
    expect(screen.getByText("Portal")).toBeInTheDocument();
  });

  it("asks which organization when several qualify", () => {
    renderWith(
      actor([membership(ACME, "Acme", true), membership(GLOBEX, "Globex", true)]),
      <RequireOrganization capacity="partner">Portal</RequireOrganization>,
    );
    expect(screen.getByText("Choose an organization")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Globex" })).toBeInTheDocument();
    expect(screen.queryByText("Portal")).not.toBeInTheDocument();
  });

  it("shows the fallback when no organization has the capacity", () => {
    renderWith(
      actor([membership(GLOBEX, "Globex", false)]),
      <RequireOrganization capacity="partner" empty="Apply first">
        Portal
      </RequireOrganization>,
    );
    expect(screen.getByText("Apply first")).toBeInTheDocument();
  });
});

describe("portals", () => {
  it("opens the Employer portal only for members of an Employer organization", () => {
    expect(getPortal("employer").canAccess(actor([membership(ACME, "Acme", true)]))).toBe(false);
    expect(getPortal("employer").canAccess(actor([membership(GLOBEX, "Globex", false)]))).toBe(
      true,
    );
  });

  it("lists the Partner portal only for Partner members, while applicants can still open it", () => {
    const applicant = actor([]);
    expect(getPortal("partner").canAccess(applicant)).toBe(true);
    expect(accessiblePortals(applicant).map((p) => p.id)).toEqual(["marketplace"]);
    const partner = actor([membership(ACME, "Acme", true)]);
    expect(accessiblePortals(partner).map((p) => p.id)).toEqual(["partner", "marketplace"]);
  });

  it("never opens the admin console with organization grants", () => {
    const member: CurrentActor = {
      ...actor([membership(ACME, "Acme", true)], ACME),
      organization: { id: ACME, permissions: new Set(["offers.offer.view"]) },
    };
    expect(getPortal("admin").canAccess(member)).toBe(false);
  });
});
