import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Schemas } from "@/shared/api";

import { PermissionPicker } from "./permission-picker";

const catalogue: Schemas["PermissionResponse"][] = [
  {
    code: "identity.user.view",
    display_name: "View users",
    description: null,
    module: "identity",
    status: "active",
    is_system: true,
  },
  {
    code: "identity.legacy",
    display_name: "Legacy",
    description: null,
    module: "identity",
    status: "retired",
    is_system: true,
  },
];

describe("<PermissionPicker>", () => {
  it("adds a permission as non-delegable and keeps delegation off until it is included", async () => {
    const onChange = vi.fn();
    render(<PermissionPicker catalogue={catalogue} value={[]} onChange={onChange} />);

    expect(screen.getByRole("checkbox", { name: "Can delegate" })).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox", { name: /View users/ }));

    expect(onChange).toHaveBeenCalledWith([{ code: "identity.user.view", delegable: false }]);
  });

  it("toggles delegation on an included permission", async () => {
    const onChange = vi.fn();
    render(
      <PermissionPicker
        catalogue={catalogue}
        value={[{ code: "identity.user.view", delegable: false }]}
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByRole("checkbox", { name: "Can delegate" }));

    expect(onChange).toHaveBeenCalledWith([{ code: "identity.user.view", delegable: true }]);
  });

  it("hides retired permissions unless the role already has them", () => {
    const { rerender } = render(
      <PermissionPicker catalogue={catalogue} value={[]} onChange={() => undefined} />,
    );
    expect(screen.queryByText("Legacy")).not.toBeInTheDocument();

    rerender(
      <PermissionPicker
        catalogue={catalogue}
        value={[{ code: "identity.legacy", delegable: false }]}
        onChange={() => undefined}
      />,
    );
    expect(screen.getByText("Legacy")).toBeInTheDocument();
    expect(screen.getByText("Retired")).toBeInTheDocument();
  });
});
