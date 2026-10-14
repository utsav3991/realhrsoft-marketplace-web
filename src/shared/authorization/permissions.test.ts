import { describe, expect, it } from "vitest";

import type { CurrentActor } from "@/shared/auth";

import { ClientBenefitPermission, IdentityPermission } from "./permission-codes";
import { can, canAny } from "./permissions";

const ORG_A = "00000000-0000-0000-0000-00000000000a";
const ORG_B = "00000000-0000-0000-0000-00000000000b";

function actor(overrides: Partial<CurrentActor> = {}): CurrentActor {
  return {
    id: "user-1",
    actorType: "staff",
    authenticationSource: "local",
    roles: [],
    globalPermissions: new Set(),
    organization: null,
    memberships: [],
    client: null,
    clients: [],
    ...overrides,
  };
}

describe("can (client scope)", () => {
  const VIEW = ClientBenefitPermission.BENEFIT_VIEW;

  it("accepts a client grant only in the selected client", () => {
    const groupHr = actor({ client: { id: ORG_A, permissions: new Set([VIEW]) } });
    expect(can(groupHr, VIEW, { clientId: ORG_A })).toBe(true);
    expect(can(groupHr, VIEW, { clientId: ORG_B })).toBe(false);
    expect(can(groupHr, VIEW, { clientId: null })).toBe(false);
  });

  it("never lets a client grant satisfy a global or organization check, nor the reverse", () => {
    const groupHr = actor({
      client: { id: ORG_A, permissions: new Set([VIEW]) },
      organization: { id: ORG_A, permissions: new Set() },
    });
    expect(can(groupHr, VIEW)).toBe(false);
    expect(can(groupHr, VIEW, { organizationId: ORG_A })).toBe(false);
    const admin = actor({ globalPermissions: new Set([VIEW]) });
    expect(can(admin, VIEW, { clientId: ORG_A })).toBe(false);
  });
});

describe("can", () => {
  it("denies without an actor", () => {
    expect(can(null, IdentityPermission.USER_VIEW)).toBe(false);
  });

  it("accepts a global grant for a platform-wide check", () => {
    const admin = actor({ globalPermissions: new Set([IdentityPermission.USER_VIEW]) });
    expect(can(admin, IdentityPermission.USER_VIEW)).toBe(true);
  });

  it("never lets a global grant satisfy an organization check (ADR-014)", () => {
    const admin = actor({
      globalPermissions: new Set([IdentityPermission.ROLE_CREATE]),
      organization: { id: ORG_A, permissions: new Set() },
    });
    expect(can(admin, IdentityPermission.ROLE_CREATE, { organizationId: ORG_A })).toBe(false);
  });

  it("denies an organization check when no organization is selected", () => {
    const member = actor({
      organization: { id: ORG_A, permissions: new Set([IdentityPermission.ROLE_VIEW]) },
    });
    expect(can(member, IdentityPermission.ROLE_VIEW, { organizationId: null })).toBe(false);
  });

  it("never lets an organization grant satisfy an unscoped check", () => {
    const member = actor({
      organization: { id: ORG_A, permissions: new Set([IdentityPermission.ROLE_VIEW]) },
    });
    expect(can(member, IdentityPermission.ROLE_VIEW)).toBe(false);
  });

  it("accepts an organization grant only for the selected organization", () => {
    const member = actor({
      organization: { id: ORG_A, permissions: new Set([IdentityPermission.ROLE_VIEW]) },
    });
    expect(can(member, IdentityPermission.ROLE_VIEW, { organizationId: ORG_A })).toBe(true);
    expect(can(member, IdentityPermission.ROLE_VIEW, { organizationId: ORG_B })).toBe(false);
  });

  it("ignores roles and actor type", () => {
    const pretender = actor({ actorType: "admin", roles: ["platform_administrator"] });
    expect(can(pretender, IdentityPermission.USER_VIEW)).toBe(false);
  });
});

describe("canAny", () => {
  it("passes when any permission is held", () => {
    const viewer = actor({ globalPermissions: new Set([IdentityPermission.ROLE_VIEW]) });
    expect(canAny(viewer, [IdentityPermission.USER_VIEW, IdentityPermission.ROLE_VIEW])).toBe(true);
    expect(canAny(viewer, [IdentityPermission.USER_VIEW])).toBe(false);
  });
});
