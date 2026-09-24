"use client";

import { Badge } from "@/design-system/primitives/badge";
import { Checkbox } from "@/design-system/primitives/checkbox";
import type { Schemas } from "@/shared/api";

import type { PermissionGrantValue } from "../schemas/admin";

type Permission = Schemas["PermissionResponse"];

interface PermissionPickerProps {
  catalogue: readonly Permission[];
  value: readonly PermissionGrantValue[];
  onChange: (next: PermissionGrantValue[]) => void;
  disabled?: boolean;
  /** Prefix for element ids, so two pickers can share a page. */
  idPrefix?: string;
  /** Only permissions of this scope can be added (a role holds codes of one scope only). */
  scope?: "global" | "organization";
}

interface Option {
  code: string;
  displayName: string;
  description: string | null;
  module: string;
  retired: boolean;
}

/**
 * Offers active catalogue permissions. A permission already in the value stays listed even
 * when it is retired or unknown, so it can be seen and removed.
 */
function optionsFor(
  catalogue: readonly Permission[],
  value: readonly PermissionGrantValue[],
  scope: "global" | "organization",
) {
  const options = new Map<string, Option>();
  for (const permission of catalogue) {
    const selected = value.some((grant) => grant.code === permission.code);
    if ((permission.status !== "active" || permission.scope !== scope) && !selected) continue;
    options.set(permission.code, {
      code: permission.code,
      displayName: permission.display_name,
      description: permission.description,
      module: permission.module,
      retired: permission.status !== "active",
    });
  }
  for (const grant of value) {
    if (options.has(grant.code)) continue;
    options.set(grant.code, {
      code: grant.code,
      displayName: grant.code,
      description: "Not in the permission catalogue.",
      module: "other",
      retired: true,
    });
  }
  const modules = new Map<string, Option[]>();
  for (const option of options.values()) {
    modules.set(option.module, [...(modules.get(option.module) ?? []), option]);
  }
  return [...modules.entries()];
}

export function PermissionPicker({
  catalogue,
  value,
  onChange,
  disabled = false,
  idPrefix = "permission",
  scope = "global",
}: PermissionPickerProps) {
  // Organization permissions are never held globally, so they cannot be delegated (ADR-014).
  const delegation = scope === "global";
  const selected = new Map(value.map((grant) => [grant.code, grant]));

  function toggle(code: string, included: boolean) {
    onChange(
      included
        ? [...value, { code, delegable: false }]
        : value.filter((grant) => grant.code !== code),
    );
  }

  function setDelegable(code: string, delegable: boolean) {
    onChange(value.map((grant) => (grant.code === code ? { ...grant, delegable } : grant)));
  }

  const modules = optionsFor(catalogue, value, scope);
  if (modules.length === 0) {
    return <p className="text-muted-foreground text-sm">The permission catalogue is empty.</p>;
  }

  return (
    <div className="space-y-4">
      {modules.map(([module, options]) => (
        <fieldset key={module} className="rounded-lg border">
          <legend className="text-muted-foreground ml-3 px-1 text-xs font-medium tracking-wide uppercase">
            {module}
          </legend>
          <ul className="divide-y">
            {options.map((option) => {
              const grant = selected.get(option.code);
              const includeId = `${idPrefix}-${option.code}`;
              const delegateId = `${includeId}-delegable`;
              return (
                <li
                  key={option.code}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={includeId}
                      className="mt-0.5"
                      checked={grant !== undefined}
                      disabled={disabled || (option.retired && grant === undefined)}
                      onCheckedChange={(checked) => toggle(option.code, checked === true)}
                    />
                    <label htmlFor={includeId} className="space-y-0.5 text-sm">
                      <span className="flex flex-wrap items-center gap-2 font-medium">
                        {option.displayName}
                        {option.retired ? <Badge intent="warning">Retired</Badge> : null}
                      </span>
                      <span className="text-muted-foreground block font-mono text-xs">
                        {option.code}
                      </span>
                      {option.description ? (
                        <span className="text-muted-foreground block">{option.description}</span>
                      ) : null}
                    </label>
                  </div>
                  {delegation ? (
                    <div className="flex items-center gap-2 pl-7 sm:pl-0">
                      <Checkbox
                        id={delegateId}
                        checked={grant?.delegable ?? false}
                        disabled={disabled || grant === undefined}
                        onCheckedChange={(checked) => setDelegable(option.code, checked === true)}
                      />
                      <label
                        htmlFor={delegateId}
                        className="text-muted-foreground text-sm whitespace-nowrap"
                      >
                        Can delegate
                      </label>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </fieldset>
      ))}
    </div>
  );
}
