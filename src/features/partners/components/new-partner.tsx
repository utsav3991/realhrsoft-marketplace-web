"use client";

import { ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Field, fieldDescriptionIds } from "@/design-system/components/field";
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
import { OrganizationFilter } from "@/features/organizations/components/organization-filter";
import { isUuid } from "@/shared/api";
import { OrganizationAdminPermission, useCan } from "@/shared/authorization";

import { useRegisterPartner } from "../api/mutations";
import type { PartnerSource } from "../api/queries";
import { EMPTY_PROFILE, profileBody } from "../schemas/partner";
import { ProfileForm } from "./profile-form";
import { SourceField } from "./source-field";

/**
 * Assisted intake: Aayulogic registers an existing organization as a pending partner on its
 * behalf. The organization comes from ?organization= (linked from its page) or is picked here.
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

  function choose(organizationId: string) {
    router.replace(`${pathname}?organization=${encodeURIComponent(organizationId)}`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Which organization is registering?</CardTitle>
        <CardDescription>
          Partners are registered for an existing organization, once per organization.
          {canBrowse ? " Search for it by name." : " Paste its ID."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {canBrowse ? (
          <OrganizationFilter
            allLabel="Select an organization"
            value={null}
            onChange={(organizationId) => {
              if (organizationId) choose(organizationId);
            }}
            fullWidth
            className="w-full"
          />
        ) : (
          <OrganizationIdForm onChoose={choose} />
        )}
      </CardContent>
    </Card>
  );
}

/** Pastes an organization ID when the actor may not browse organizations; the API checks it. */
function OrganizationIdForm({ onChoose }: { onChoose: (organizationId: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string>();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = value.trim();
    if (!isUuid(id)) {
      setError("Enter a valid organization ID");
      return;
    }
    onChoose(id);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-wrap items-start gap-2">
      <Field id="organization-id" label="Organization ID" error={error} className="grow">
        <Input
          id="organization-id"
          className="font-mono"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={fieldDescriptionIds("organization-id", { error })}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </Field>
      <Button type="submit" className="mt-5.5">
        Continue
      </Button>
    </form>
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
  const [source, setSource] = useState<PartnerSource>("partner_organization");

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
              source,
            });
            toast.success(`Registered ${partner.business_name}`);
            router.push(`/admin/partners/${partner.id}`);
          }}
        >
          <SourceField value={source} onChange={setSource} />
        </ProfileForm>
      </CardContent>
    </Card>
  );
}
