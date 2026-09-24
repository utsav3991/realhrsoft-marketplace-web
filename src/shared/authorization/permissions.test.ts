import { describe, expect, it } from "vitest";

import type { CurrentActor } from "@/shared/auth";

import { IdentityPermission } from "./permission-codes";
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
    ...overrides,
  };
}

describe("can", () => {
  it("denies without an actor", () => {
    expect(can(null, IdentityPermission.USER_VIEW)).toBe(false);
  });

  it("accepts a global grant for unscoped and scoped checks", () => {
    const admin = actor({ globalPermissions: new Set([IdentityPermission.USER_VIEW]) });
    expect(can(admin, IdentityPermission.USER_VIEW)).toBe(true);
    expect(can(admin, IdentityPermission.USER_VIEW, { organizationId: ORG_A })).toBe(true);
  });

  it("never lets an organization grant satisfy an unscoped check", () => {
    const member = actor({
      organization: { id: ORG_A, permissions: new Set([IdentityPermission.USER_VIEW]) },
    });
    expect(can(member, IdentityPermission.USER_VIEW)).toBe(false);
  });

  it("accepts an organization grant only for the selected organization", () => {
    const member = actor({
      organization: { id: ORG_A, permissions: new Set([IdentityPermission.USER_VIEW]) },
    });
    expect(can(member, IdentityPermission.USER_VIEW, { organizationId: ORG_A })).toBe(true);
    expect(can(member, IdentityPermission.USER_VIEW, { organizationId: ORG_B })).toBe(false);
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
