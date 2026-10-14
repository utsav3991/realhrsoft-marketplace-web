import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";

import { makeQueryClient, type Schemas } from "@/shared/api";
import { SessionContext, type CurrentActor, type SessionValue } from "@/shared/auth";
import { ImpersonateAction, ImpersonationBanner } from "./impersonation";

const start = vi.fn();
const end = vi.fn();
vi.mock("../api/impersonation", () => ({
  useImpersonate: () => ({ mutateAsync: start }),
  useEndImpersonation: () => ({ mutate: end, isPending: false, isError: false }),
}));
const actor: CurrentActor = {
  id: "admin",
  actorType: "staff",
  authenticationSource: "local",
  roles: [],
  globalPermissions: new Set(),
  organization: null,
  memberships: [],
  client: null,
  clients: [],
  superuser: true,
  impersonator: null,
};
const user: Schemas["UserDetail"] = {
  id: "partner",
  email: "partner@example.com",
  username: "partner",
  first_name: null,
  last_name: null,
  contact: null,
  actor_type: "staff",
  status: "active",
  password_setup_pending: false,
  grants: [],
  impersonable: true,
};
function show(current = actor, target = user) {
  const session: SessionValue = {
    status: "authenticated",
    actor: current,
    error: null,
    login: async () => undefined,
    logout: async () => undefined,
  };
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <SessionContext.Provider value={session}>
        <ImpersonateAction user={target} />
        <ImpersonationBanner />
      </SessionContext.Provider>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  start.mockReset();
  end.mockReset();
});

it.each([
  [{ ...actor, superuser: false }, user],
  [{ ...actor, id: user.id }, user],
  [actor, { ...user, impersonable: false }],
  [{ ...actor, impersonator: { id: "root", email: "root@example.com" } }, user],
])("hides start when the actor or target is ineligible", (current, target) => {
  show(current, target);
  expect(screen.queryByRole("button", { name: "Sign in as partner" })).not.toBeInTheDocument();
});

it("requires an audited reason and identifies the target", async () => {
  const ui = userEvent.setup();
  show();
  await ui.click(screen.getByRole("button", { name: "Sign in as partner" }));
  expect(
    screen.getByRole("heading", { name: "Sign in as partner@example.com?" }),
  ).toBeInTheDocument();
  await ui.click(screen.getAllByRole("button", { name: "Sign in as partner" }).at(-1)!);
  expect(start).not.toHaveBeenCalled();
  await ui.type(screen.getByRole("textbox", { name: /Reason/ }), "Investigate missing offer");
  await ui.click(screen.getAllByRole("button", { name: "Sign in as partner" }).at(-1)!);
  await waitFor(() =>
    expect(start).toHaveBeenCalledWith({ user_id: "partner", reason: "Investigate missing offer" }),
  );
});

it("keeps a failed start in the dialog", async () => {
  start.mockRejectedValue(new Error("Connection unavailable"));
  const ui = userEvent.setup();
  show();
  await ui.click(screen.getByRole("button", { name: "Sign in as partner" }));
  await ui.type(screen.getByRole("textbox", { name: /Reason/ }), "Investigate missing offer");
  await ui.click(screen.getAllByRole("button", { name: "Sign in as partner" }).at(-1)!);
  expect(await screen.findByRole("alert")).toBeInTheDocument();
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});

it("shows attribution and lets the administrator return", async () => {
  show({ ...actor, superuser: false, impersonator: { id: "root", email: "root@example.com" } });
  expect(screen.getByText(/Actions are recorded as root@example.com/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Return to administrator" }));
  expect(end).toHaveBeenCalledOnce();
});
