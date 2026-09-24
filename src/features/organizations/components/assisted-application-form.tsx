"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { fieldDescriptionIds, FormField } from "@/design-system/components/form-field";
import { Alert, AlertDescription, AlertTitle } from "@/design-system/primitives/alert";
import { Button } from "@/design-system/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/design-system/primitives/card";
import { Input } from "@/design-system/primitives/input";
import { Textarea } from "@/design-system/primitives/textarea";
import { errorMessage } from "@/shared/api";
import { applyApiFieldErrors } from "@/shared/forms/api-field-errors";

import { useCreateAssistedApplication } from "../api/mutations";
import {
  assistedApplicationSchema,
  BUSINESS_FIELDS,
  businessBody,
  EMPTY_BUSINESS,
  type AssistedApplicationValues,
} from "../schemas/business";
import { BusinessFields } from "./business-fields";

/** Aayulogic-assisted intake: the same application, submitted on behalf of an existing user. */
export function AssistedApplicationForm() {
  const router = useRouter();
  const create = useCreateAssistedApplication();
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<AssistedApplicationValues>({
    resolver: zodResolver(assistedApplicationSchema),
    defaultValues: { ...EMPTY_BUSINESS, applicantUserId: "", reason: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      const { id } = await create.mutateAsync({
        ...businessBody(values),
        applicant_user_id: values.applicantUserId,
        reason: values.reason,
      });
      toast.success("Application created");
      router.push(`/admin/partner-applications/${id}`);
    } catch (error) {
      const placed = applyApiFieldErrors(error, form, {
        ...BUSINESS_FIELDS,
        applicant_user_id: "applicantUserId",
        reason: "reason",
      });
      if (!placed) setFailure(errorMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {failure ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertTitle>The application was not created</AlertTitle>
          <AlertDescription>{failure}</AlertDescription>
        </Alert>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Applicant</CardTitle>
        </CardHeader>
        <CardContent>
          <FormField
            id="applicant"
            label="Applicant user ID"
            hint="The account that will own the application. Each account can have one application."
            error={errors.applicantUserId?.message}
          >
            <Input
              id="applicant"
              className="font-mono"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={errors.applicantUserId ? true : undefined}
              aria-describedby={fieldDescriptionIds("applicant", {
                hint: true,
                error: errors.applicantUserId,
              })}
              {...form.register("applicantUserId")}
            />
          </FormField>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Business</CardTitle>
        </CardHeader>
        <CardContent>
          <BusinessFields form={form} disabled={isSubmitting} />
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <FormField
            id="assisted-reason"
            label="Reason"
            hint="Recorded in the audit log."
            error={errors.reason?.message}
          >
            <Textarea
              id="assisted-reason"
              rows={3}
              aria-invalid={errors.reason ? true : undefined}
              aria-describedby={fieldDescriptionIds("assisted-reason", {
                hint: true,
                error: errors.reason,
              })}
              {...form.register("reason")}
            />
          </FormField>
        </CardContent>
      </Card>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button asChild variant="outline">
          <Link href="/admin/partner-applications">Cancel</Link>
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
          Create application
        </Button>
      </div>
    </form>
  );
}
