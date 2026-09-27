"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, X } from "lucide-react";
import { useEffect, useState, type KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/design-system/primitives/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/design-system/primitives/dialog";
import {
  Form,
  FormAlert,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/design-system/primitives/form";
import { Input } from "@/design-system/primitives/input";
import { Textarea } from "@/design-system/primitives/textarea";
import { useUsers } from "@/features/identity/api/queries";
import { useOrganizations } from "@/features/organizations/api/queries";
import { errorMessage, FIRST_PAGE } from "@/shared/api";
import { IdentityPermission, OrganizationAdminPermission, useCan } from "@/shared/authorization";
import { applyApiFieldErrors } from "@/shared/forms/api-field-errors";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";

import { useStartEmployment } from "../api/mutations";
import { startEmploymentSchema, type StartEmploymentValues } from "../schemas/employment";

interface Chosen {
  id: string;
  label: string;
}

interface StartEmploymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fixes the employee, e.g. when started from their user page. */
  employee?: Chosen;
}

/**
 * Records an employee's current employer, which opens the marketplace to them. The employee
 * must be an active employee account; one current employment at a time.
 */
export function StartEmploymentDialog({
  open,
  onOpenChange,
  employee,
}: StartEmploymentDialogProps) {
  const start = useStartEmployment();
  const [failure, setFailure] = useState<string | null>(null);
  const [user, setUser] = useState<Chosen | null>(employee ?? null);
  const [organization, setOrganization] = useState<Chosen | null>(null);
  const defaults = { userId: employee?.id ?? "", organizationId: "", reason: "" };
  const form = useForm<StartEmploymentValues>({
    resolver: zodResolver(startEmploymentSchema),
    defaultValues: defaults,
  });
  const { isSubmitting } = form.formState;

  function handleOpenChange(next: boolean) {
    if (isSubmitting) return;
    if (!next) {
      form.reset(defaults);
      setUser(employee ?? null);
      setOrganization(null);
      setFailure(null);
    }
    onOpenChange(next);
  }

  function choose(field: "userId" | "organizationId", chosen: Chosen | null) {
    (field === "userId" ? setUser : setOrganization)(chosen);
    form.setValue(field, chosen?.id ?? "", { shouldValidate: form.formState.isSubmitted });
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      await start.mutateAsync({
        user_id: values.userId,
        organization_id: values.organizationId,
        reason: values.reason,
      });
      toast.success(`Employment started for ${user?.label ?? "the employee"}`);
      handleOpenChange(false);
    } catch (error) {
      const placed = applyApiFieldErrors(error, form, {
        user_id: "userId",
        organization_id: "organizationId",
        reason: "reason",
      });
      if (!placed) setFailure(errorMessage(error));
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={onSubmit} noValidate className="grid gap-5">
            <DialogHeader>
              <DialogTitle>Start employment</DialogTitle>
              <DialogDescription>
                The employee can browse and claim offers targeted at this employer until the
                employment ends. It grants no role and no portal membership.
              </DialogDescription>
            </DialogHeader>

            {failure ? <FormAlert>{failure}</FormAlert> : null}

            <FormField
              control={form.control}
              name="userId"
              render={() => (
                <FormItem>
                  <FormLabel>Employee</FormLabel>
                  {employee ? (
                    <p className="text-sm">{employee.label}</p>
                  ) : (
                    <UserChooser chosen={user} onChoose={(chosen) => choose("userId", chosen)} />
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="organizationId"
              render={() => (
                <FormItem>
                  <FormLabel>Employer</FormLabel>
                  <OrganizationChooser
                    chosen={organization}
                    onChoose={(chosen) => choose("organizationId", chosen)}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormDescription>Recorded in the audit log.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
                Start employment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ChosenValue({ chosen, onClear }: { chosen: Chosen; onClear: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
      <span className="truncate text-sm">{chosen.label}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8"
        aria-label="Change"
        onClick={onClear}
      >
        <X aria-hidden />
      </Button>
    </div>
  );
}

/** Searches as the user types; Enter never submits the dialog form. */
function SearchInput({
  label,
  onSearch,
}: {
  label: string;
  onSearch: (value: string | null) => void;
}) {
  const [draft, setDraft] = useState("");
  const debounced = useDebouncedValue(draft.trim(), 300);
  useEffect(() => onSearch(debounced || null), [debounced, onSearch]);
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") event.preventDefault();
  };
  return (
    <Input
      type="search"
      aria-label={label}
      placeholder={label}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={onKeyDown}
    />
  );
}

/** Pastes an identifier when the actor may not browse the directory; the API checks it. */
function IdInput({ label, onChoose }: { label: string; onChoose: (chosen: Chosen) => void }) {
  return (
    <Input
      aria-label={label}
      placeholder={label}
      className="font-mono"
      autoComplete="off"
      spellCheck={false}
      onChange={(event) => {
        const id = event.target.value.trim();
        onChoose({ id, label: id });
      }}
    />
  );
}

function UserChooser({
  chosen,
  onChoose,
}: {
  chosen: Chosen | null;
  onChoose: (chosen: Chosen | null) => void;
}) {
  const canBrowse = useCan(IdentityPermission.USER_VIEW);
  const [search, setSearch] = useState<string | null>(null);
  if (!canBrowse) return <IdInput label="Employee user ID" onChoose={onChoose} />;
  if (chosen) return <ChosenValue chosen={chosen} onClear={() => onChoose(null)} />;
  return (
    <div className="space-y-2">
      <SearchInput label="Search employees by name or email" onSearch={setSearch} />
      {search !== null ? <UserResults search={search} onChoose={onChoose} /> : null}
    </div>
  );
}

function UserResults({ search, onChoose }: { search: string; onChoose: (c: Chosen) => void }) {
  const users = useUsers({ status: "active", q: search, ordering: null }, FIRST_PAGE);
  if (users.isPending) return <p className="text-muted-foreground text-sm">Searching…</p>;
  if (users.isError) return <p className="text-destructive text-sm">Users could not be loaded.</p>;
  // Only employee accounts can be employed; the API refuses any other.
  const rows = users.data.results.filter((user) => user.actor_type === "employee").slice(0, 8);
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No active employee accounts match. Create one under Users as an employee.
      </p>
    );
  }
  return (
    <ul className="divide-y rounded-lg border">
      {rows.map((user) => (
        <li key={user.id} className="flex items-center justify-between gap-2 px-3 py-2">
          <span className="truncate text-sm">{user.email}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChoose({ id: user.id, label: user.email })}
          >
            Choose
          </Button>
        </li>
      ))}
    </ul>
  );
}

function OrganizationChooser({
  chosen,
  onChoose,
}: {
  chosen: Chosen | null;
  onChoose: (chosen: Chosen | null) => void;
}) {
  const canBrowse = useCan(OrganizationAdminPermission.ORGANIZATION_VIEW);
  const [search, setSearch] = useState<string | null>(null);
  if (!canBrowse) return <IdInput label="Organization ID" onChoose={onChoose} />;
  if (chosen) return <ChosenValue chosen={chosen} onClear={() => onChoose(null)} />;
  return (
    <div className="space-y-2">
      <SearchInput label="Search organizations" onSearch={setSearch} />
      {search !== null ? <OrganizationResults search={search} onChoose={onChoose} /> : null}
    </div>
  );
}

function OrganizationResults({
  search,
  onChoose,
}: {
  search: string;
  onChoose: (c: Chosen) => void;
}) {
  const organizations = useOrganizations({ search, ordering: null }, FIRST_PAGE);
  if (organizations.isPending) return <p className="text-muted-foreground text-sm">Searching…</p>;
  if (organizations.isError)
    return <p className="text-destructive text-sm">Organizations could not be loaded.</p>;
  const rows = organizations.data.results.slice(0, 8);
  if (rows.length === 0) return <p className="text-muted-foreground text-sm">No matches.</p>;
  return (
    <ul className="divide-y rounded-lg border">
      {rows.map((organization) => (
        <li key={organization.id} className="flex items-center justify-between gap-2 px-3 py-2">
          <span className="truncate text-sm">{organization.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChoose({ id: organization.id, label: organization.name })}
          >
            Choose
          </Button>
        </li>
      ))}
    </ul>
  );
}
