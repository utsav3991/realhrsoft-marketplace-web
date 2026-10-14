"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

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
import { ApiError } from "@/shared/api";
import { FormSection } from "@/design-system/primitives/form";

import { useOnboardMerchant } from "../api/mutations";
import type { PartnerSource } from "../api/queries";
import { EMPTY_PROFILE, profileBody } from "../schemas/partner";
import { ProfileForm } from "./profile-form";
import { SourceField } from "./source-field";

// Mirrors MerchantOnboardingSerializer: the home organization and its first administrator.
const onboardingSchema = z.object({
  organizationName: z.string().trim().min(1, "Enter the organization's name").max(255),
  email: z.string().trim().max(254).pipe(z.email("Enter a valid email")),
  firstName: z.string().trim().min(1, "Enter a first name").max(50),
  lastName: z.string().trim().min(1, "Enter a last name").max(50),
});
type OnboardingValues = z.infer<typeof onboardingSchema>;
type OnboardingErrors = Partial<Record<keyof OnboardingValues, string>>;

const EMPTY: OnboardingValues = { organizationName: "", email: "", firstName: "", lastName: "" };

const FIELDS: readonly {
  name: keyof OnboardingValues;
  label: string;
  type?: string;
  autoComplete?: string;
  hint?: string;
}[] = [
  {
    name: "organizationName",
    label: "Organization (legal name)",
    autoComplete: "organization",
    hint: "Created as the merchant's home organization.",
  },
  {
    name: "email",
    label: "Administrator email",
    type: "email",
    autoComplete: "off",
    hint: "An existing account is linked and told; otherwise one is created and emailed a link to set a password.",
  },
  { name: "firstName", label: "First name", autoComplete: "off" },
  { name: "lastName", label: "Last name", autoComplete: "off" },
];

const OUTCOME: Record<string, string> = {
  created: "a new account was emailed a link to set a password",
  added: "their existing account was linked and told",
  rejoined: "their existing account was linked and told",
  role_repaired: "their administrator role was restored",
  unchanged: "they already administered it",
};

/**
 * Assisted merchant onboarding: one step creates the home organization, the pending merchant
 * and its first administrator (merchant_administrator), so a business with no account yet can
 * sign in, complete its profile and wait for verification.
 */
export function OnboardMerchant() {
  const router = useRouter();
  const onboard = useOnboardMerchant();
  const [source, setSource] = useState<PartnerSource>("partner_organization");
  const [extra, setExtra] = useState<OnboardingValues>(EMPTY);
  const [errors, setErrors] = useState<OnboardingErrors>({});

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link href="/admin/partners">
          <ArrowLeft aria-hidden />
          Partners
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Onboard a merchant</CardTitle>
          <CardDescription>
            Creates the merchant&apos;s organization, registers it as a pending merchant and gives
            its administrator an account, all at once. The administrator can sign in straight away;
            offers still need verification to go live.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            defaultValues={EMPTY_PROFILE}
            reasonRequired
            submitLabel="Onboard merchant"
            onSubmit={async (values) => {
              const parsed = onboardingSchema.safeParse(extra);
              if (!parsed.success) {
                setErrors(
                  Object.fromEntries(
                    parsed.error.issues.map((issue) => [issue.path[0], issue.message]),
                  ) as OnboardingErrors,
                );
                throw new ApiError({
                  status: 422,
                  code: "VALIDATION_ERROR",
                  title: "Check the organization and administrator",
                  detail: "Check the organization and administrator fields.",
                });
              }
              setErrors({});
              const result = await onboard.mutateAsync({
                ...profileBody(values),
                reason: values.reason,
                source,
                organization_name: parsed.data.organizationName,
                administrator: {
                  email: parsed.data.email,
                  first_name: parsed.data.firstName,
                  last_name: parsed.data.lastName,
                },
              });
              toast.success(
                `Onboarded ${result.business_name}: ${OUTCOME[result.administrator.outcome] ?? "done"}.`,
              );
              router.push(`/admin/partners/${result.id}`);
            }}
          >
            <FormSection title="Organization and administrator">
              {FIELDS.map((spec) => {
                const id = `onboard-${spec.name}`;
                const error = errors[spec.name];
                return (
                  <Field key={spec.name} id={id} label={spec.label} hint={spec.hint} error={error}>
                    <Input
                      id={id}
                      type={spec.type}
                      autoComplete={spec.autoComplete}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={fieldDescriptionIds(id, { hint: spec.hint, error })}
                      value={extra[spec.name]}
                      onChange={(event) =>
                        setExtra((current) => ({ ...current, [spec.name]: event.target.value }))
                      }
                    />
                  </Field>
                );
              })}
            </FormSection>
            <SourceField value={source} onChange={setSource} />
          </ProfileForm>
        </CardContent>
      </Card>
    </div>
  );
}
