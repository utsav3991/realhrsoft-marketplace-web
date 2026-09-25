"use client";

import { ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { FormField } from "@/design-system/components/form-field";
import { Button } from "@/design-system/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/design-system/primitives/card";
import { Input } from "@/design-system/primitives/input";
import { useOrganization } from "@/features/organizations/api/queries";
import { isUuid } from "@/shared/api";
import { OrganizationAdminPermission, useCan } from "@/shared/authorization";

import { useRegisterPartner } from "../api/mutations";
import { EMPTY_PROFILE, profileBody } from "../schemas/partner";
import { ProfileForm } from "./profile-form";

/**
 * Assisted intake: Aayulogic registers an existing organization as a pending partner on its
 * behalf. The organization comes from ?organization= (linked from its page) or is entered here.
 */
export function NewPartner() {
  const searchParams = useSearchParams();
  const organization = searchParams.get("organization");
  const organizationId = organization && isUuid(organization) ? organization : null;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link href="/admin/partners">
          <ArrowLeft aria-hidden />
          Partners
        </Link>
      </Button>
      {organizationId ? (
        <RegistrationForm organizationId={organizationId} />
      ) : (
        <ChooseOrganization />
      )}
    </div>
  );
}

function ChooseOrganization() {
  const router = useRouter();
  const pathname = usePathname();
  const canBrowse = useCan(OrganizationAdminPermission.ORGANIZATION_VIEW);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string>();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = value.trim();
    if (!isUuid(id)) {
      setError("Enter a valid organization ID");
      return;
    }
    router.replace(`${pathname}?organization=${encodeURIComponent(id)}`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Which organization is registering?</CardTitle>
        <CardDescription>
          Partners are registered for an existing organization, once per organization.
          {canBrowse ? (
            <>
              {" "}
              Open it from{" "}
              <Link href="/admin/organizations" className="text-primary hover:underline">
                Organizations
              </Link>{" "}
              and choose Register as partner, or paste its ID.
            </>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="flex flex-wrap items-end gap-2">
          <FormField id="organization-id" label="Organization ID" error={error} className="grow">
            <Input
              id="organization-id"
              className="font-mono"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "organization-id-error" : undefined}
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </FormField>
          <Button type="submit">Continue</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function OrganizationName({ organizationId }: { organizationId: string }) {
  const organization = useOrganization(organizationId);
  return organization.isSuccess ? (
    <>{organization.data.name}</>
  ) : (
    <span className="font-mono text-xs">{organizationId}</span>
  );
}

function RegistrationForm({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const register = useRegisterPartner();
  const canViewOrganization = useCan(OrganizationAdminPermission.ORGANIZATION_VIEW);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register a partner</CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-2">
          <Building2 className="size-4" aria-hidden />
          {canViewOrganization ? (
            <OrganizationName organizationId={organizationId} />
          ) : (
            <span className="font-mono text-xs">{organizationId}</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          The partner starts pending, recorded as assisted intake with you as the registrant, and
          goes through the same verification review as a self-service application.
        </p>
        <ProfileForm
          defaultValues={EMPTY_PROFILE}
          reasonRequired
          submitLabel="Register partner"
          onSubmit={async (values) => {
            const partner = await register.mutateAsync({
              ...profileBody(values),
              reason: values.reason,
              organization_id: organizationId,
            });
            toast.success(`Registered ${partner.business_name}`);
            router.push(`/admin/partners/${partner.id}`);
          }}
        />
      </CardContent>
    </Card>
  );
}
