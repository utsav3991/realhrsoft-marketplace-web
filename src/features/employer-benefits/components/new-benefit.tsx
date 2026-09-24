"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useSelectedOrganizationId } from "@/shared/auth";
import { Button } from "@/design-system/primitives/button";

import { useCreateBenefit } from "../api/benefits";
import { benefitBody, EMPTY_BENEFIT } from "../schemas/benefit";
import { BenefitForm } from "./benefit-form";

export function NewBenefit() {
  const organizationId = useSelectedOrganizationId();
  const router = useRouter();
  const create = useCreateBenefit(organizationId);
  return (
    <BenefitForm
      title="Benefit details"
      initial={EMPTY_BENEFIT}
      submitLabel="Create draft"
      actions={
        <Button asChild variant="outline">
          <Link href="/employer">Cancel</Link>
        </Button>
      }
      onSubmit={async (values) => {
        const { id } = await create.mutateAsync(benefitBody(values));
        toast.success("Draft created. Publish it when it is ready.");
        router.push(`/employer/benefits/${id}`);
      }}
    />
  );
}
