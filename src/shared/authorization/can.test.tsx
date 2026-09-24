import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { SessionContext, type CurrentActor, type SessionValue } from "@/shared/auth";

import { Can } from "./can";
import { IdentityPermission } from "./permission-codes";

function withActor(actor: CurrentActor | null, children: ReactNode) {
  const session: SessionValue = {
    status: actor ? "authenticated" : "anonymous",
    actor,
    error: null,
    login: async () => undefined,
    logout: async () => undefined,
  };
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

const viewer: CurrentActor = {
  id: "user-1",
  actorType: "staff",
  authenticationSource: "local",
  roles: [],
  globalPermissions: new Set([IdentityPermission.USER_VIEW]),
  organization: null,
  memberships: [],
};

describe("<Can>", () => {
  it("renders children when the permission is held", () => {
    render(withActor(viewer, <Can permission={IdentityPermission.USER_VIEW}>Users</Can>));
    expect(screen.getByText("Users")).toBeInTheDocument();
  });

  it("renders the fallback when the permission is absent", () => {
    render(
      withActor(
        viewer,
        <Can permission={IdentityPermission.USER_DISABLE} fallback="No access">
          Disable
        </Can>,
      ),
    );
    expect(screen.queryByText("Disable")).not.toBeInTheDocument();
    expect(screen.getByText("No access")).toBeInTheDocument();
  });

  it("renders nothing while signed out", () => {
    const { container } = render(
      withActor(null, <Can anyOf={[IdentityPermission.USER_VIEW]}>Users</Can>),
    );
    expect(container).toBeEmptyDOMElement();
  });
});
