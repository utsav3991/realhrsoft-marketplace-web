"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  CircleHelp,
  Keyboard,
  Loader2,
  ReceiptText,
  RotateCcw,
  ScanLine,
  TimerOff,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/design-system/primitives/alert";
import { Button } from "@/design-system/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/design-system/primitives/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/design-system/primitives/form";
import { Input } from "@/design-system/primitives/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/design-system/primitives/tabs";
import { NotAPartner, useIsPartner } from "@/features/offers/components/own-offers";
import { ApiError } from "@/shared/api";
import { useSelectedOrganizationId } from "@/shared/auth";
import { PartnerRedemptionPermission, useCanInOrganization } from "@/shared/authorization";
import { Detail, DetailList } from "@/shared/components/details";
import { useIdempotencyKey, isDefiniteFailure } from "@/shared/hooks/use-idempotency-key";
import { formatDateTime } from "@/shared/lib/format";

import {
  useConfirmUse,
  useRecoverConfirmation,
  useValidateVoucher,
  type ConfirmProof,
} from "../api/mutations";
import type { PartnerReceipt, Scan } from "../api/queries";
import {
  normalizeReference,
  referenceFormSchema,
  saleFormSchema,
  scanFormSchema,
  type ReferenceValues,
  type SaleValues,
  type ScanValues,
} from "../schemas/counter";

import {
  BenefitText,
  PresentationFacts,
  ReceiptFacts,
  VoucherErrorAlert,
} from "./redemption-details";

/**
 * The counter moves entry → (scanned) → confirmed. A confirmation whose response was lost is
 * "unknown" until its receipt is looked up by the attempt's Idempotency-Key.
 */
type Stage =
  | { step: "entry" }
  | { step: "scanned"; scan: Scan }
  | { step: "unknown"; proof: ConfirmProof; saleReference: string }
  | { step: "confirmed"; receipt: PartnerReceipt };

/**
 * The partner's counter: validate the customer's QR, apply the benefit it shows, and confirm
 * the use. Validating neither uses nor holds the voucher; only the confirmation does, and a
 * voucher is confirmed at most once, so the benefit is applied only after the receipt.
 */
export function RedeemCounter() {
  const isPartner = useIsPartner();
  const organizationId = useSelectedOrganizationId();
  const canValidate = useCanInOrganization(PartnerRedemptionPermission.VOUCHER_VALIDATE);
  const canConfirm = useCanInOrganization(PartnerRedemptionPermission.VOUCHER_CONFIRM);
  const [stage, setStage] = useState<Stage>({ step: "entry" });
  const attempt = useIdempotencyKey();
  const confirm = useConfirmUse(organizationId);

  if (!isPartner) {
    return (
      <NotAPartner description="Register the business and pass Aayulogic verification; you can then redeem your offers' vouchers here." />
    );
  }

  function restart() {
    attempt.reset();
    confirm.reset();
    setStage({ step: "entry" });
  }

  async function confirmUse(proof: ConfirmProof, saleReference: string) {
    try {
      const receipt = await attempt.run((idempotencyKey) =>
        confirm.mutateAsync({ proof, saleReference, idempotencyKey }),
      );
      setStage({ step: "confirmed", receipt });
    } catch (error) {
      if (!isDefiniteFailure(error)) setStage({ step: "unknown", proof, saleReference });
    }
  }

  switch (stage.step) {
    case "entry":
      return (
        <Entry
          organizationId={organizationId}
          canValidate={canValidate}
          canConfirm={canConfirm}
          confirming={confirm.isPending}
          confirmError={confirm.error}
          onScanned={(scan) => {
            confirm.reset();
            setStage({ step: "scanned", scan });
          }}
          onConfirmReference={(values) =>
            confirmUse(
              { voucherReference: normalizeReference(values.voucherReference) },
              values.saleReference,
            )
          }
        />
      );
    case "scanned":
      return (
        <Scanned
          scan={stage.scan}
          canConfirm={canConfirm}
          confirming={confirm.isPending}
          confirmError={confirm.error}
          onConfirm={(values) =>
            confirmUse({ scanReference: stage.scan.scan_reference }, values.saleReference)
          }
          onCancel={restart}
        />
      );
    case "unknown":
      return (
        <UnknownOutcome
          organizationId={organizationId}
          idempotencyKey={attempt.pending()}
          retrying={confirm.isPending}
          retryError={confirm.error}
          onRetry={() => void confirmUse(stage.proof, stage.saleReference)}
          onRecovered={(receipt) => {
            attempt.reset();
            setStage({ step: "confirmed", receipt });
          }}
          onNotRecorded={restart}
        />
      );
    case "confirmed":
      return <Confirmed receipt={stage.receipt} onNext={restart} />;
  }
}

function Entry({
  organizationId,
  canValidate,
  canConfirm,
  confirming,
  confirmError,
  onScanned,
  onConfirmReference,
}: {
  organizationId: string;
  canValidate: boolean;
  canConfirm: boolean;
  confirming: boolean;
  confirmError: unknown;
  onScanned: (scan: Scan) => void;
  onConfirmReference: (values: ReferenceValues) => Promise<void>;
}) {
  const [mode, setMode] = useState(canValidate ? "scan" : "reference");
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Redeem a voucher</CardTitle>
        <CardDescription>
          Scan the QR code on the customer&apos;s phone. If it will not scan, type the 10-character
          code shown under it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={mode} onValueChange={setMode}>
          <TabsList>
            <TabsTrigger value="scan" disabled={!canValidate}>
              <ScanLine aria-hidden />
              Scan QR
            </TabsTrigger>
            <TabsTrigger value="reference" disabled={!canConfirm}>
              <Keyboard aria-hidden />
              Type code
            </TabsTrigger>
          </TabsList>
          <TabsContent value="scan" className="pt-4">
            <ScanForm organizationId={organizationId} onScanned={onScanned} />
          </TabsContent>
          <TabsContent value="reference" className="pt-4">
            <ReferenceForm
              confirming={confirming}
              error={confirmError}
              onConfirm={onConfirmReference}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

/** A handheld scanner types the QR text and presses Enter, which submits the form. */
function ScanForm({
  organizationId,
  onScanned,
}: {
  organizationId: string;
  onScanned: (scan: Scan) => void;
}) {
  const validate = useValidateVoucher(organizationId);
  const form = useForm<ScanValues>({
    resolver: zodResolver(scanFormSchema),
    defaultValues: { token: "" },
  });
  const onSubmit = form.handleSubmit(async ({ token }) => {
    // The QR is the customer's secret: it leaves the field as soon as it is sent.
    form.reset({ token: "" });
    try {
      onScanned(await validate.mutateAsync(token));
    } catch {
      form.setFocus("token");
    }
  });
  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        {validate.isError ? <VoucherErrorAlert error={validate.error} /> : null}
        <FormField
          control={form.control}
          name="token"
          render={({ field }) => (
            <FormItem>
              <FormLabel>QR code</FormLabel>
              <FormControl>
                <Input
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono"
                  placeholder="Scan now, or paste the scanned text"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Checking a QR code does not use the voucher. Apply the benefit only after you
                confirm the use.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div>
          <Button type="submit" disabled={validate.isPending}>
            {validate.isPending ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <ScanLine aria-hidden />
            )}
            Check voucher
          </Button>
        </div>
      </form>
    </Form>
  );
}

function SaleReferenceField({ disabled }: { disabled?: boolean }) {
  return (
    <FormField
      name="saleReference"
      render={({ field }) => (
        <FormItem>
          <FormLabel optional>Bill reference</FormLabel>
          <FormControl>
            <Input autoComplete="off" disabled={disabled} {...field} />
          </FormControl>
          <FormDescription>Your bill or POS number, kept on the receipt.</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/** Without a scan the benefit is not shown first, so the cashier confirms the code itself. */
function ReferenceForm({
  confirming,
  error,
  onConfirm,
}: {
  confirming: boolean;
  error: unknown;
  onConfirm: (values: ReferenceValues) => Promise<void>;
}) {
  const form = useForm<ReferenceValues>({
    resolver: zodResolver(referenceFormSchema),
    defaultValues: { voucherReference: "", saleReference: "" },
  });
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onConfirm)} noValidate className="grid gap-4">
        {error ? <VoucherErrorAlert error={error} /> : null}
        <FormField
          control={form.control}
          name="voucherReference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Voucher code</FormLabel>
              <FormControl>
                <Input
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={14}
                  className="font-mono text-lg tracking-[0.2em] uppercase"
                  placeholder="K7M2Q9XH4T"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <SaleReferenceField disabled={confirming} />
        <p className="text-muted-foreground text-sm font-medium">
          Confirming uses the voucher now. The receipt shows the offer; apply its benefit then.
        </p>
        <div>
          <Button type="submit" disabled={confirming}>
            {confirming ? <Loader2 className="animate-spin" aria-hidden /> : null}
            Confirm use
          </Button>
        </div>
      </form>
    </Form>
  );
}

function useSecondsLeft(until: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return Math.max(0, Math.ceil((new Date(until).getTime() - now) / 1000));
}

/** The benefit to apply once confirmed. The customer's identity is never shown to partners. */
function Scanned({
  scan,
  canConfirm,
  confirming,
  confirmError,
  onConfirm,
  onCancel,
}: {
  scan: Scan;
  canConfirm: boolean;
  confirming: boolean;
  confirmError: unknown;
  onConfirm: (values: SaleValues) => Promise<void>;
  onCancel: () => void;
}) {
  const voucher = scan.voucher;
  const secondsLeft = useSecondsLeft(scan.expires_at);
  const expired = secondsLeft === 0;
  const form = useForm<SaleValues>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: { saleReference: "" },
  });
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{voucher.title}</CardTitle>
        <CardDescription>{voucher.headline}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <DetailList className="lg:grid-cols-2">
          <Detail label="Benefit">
            <BenefitText benefit={voucher.benefit} />
          </Detail>
          <PresentationFacts presentation={voucher.presentation} />
          <Detail label="Voucher valid until">{formatDateTime(voucher.valid_until)}</Detail>
        </DetailList>
        {expired ? (
          <Alert variant="warning">
            <TimerOff aria-hidden />
            <AlertTitle>This scan expired</AlertTitle>
            <AlertDescription>Scan the customer&apos;s QR code again to confirm.</AlertDescription>
          </Alert>
        ) : canConfirm ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onConfirm)} noValidate className="grid gap-4">
              {confirmError ? <VoucherErrorAlert error={confirmError} /> : null}
              <SaleReferenceField disabled={confirming} />
              <p className="text-muted-foreground text-sm font-medium" aria-live="polite">
                Not used yet. Confirm within {Math.floor(secondsLeft / 60)}:
                {String(secondsLeft % 60).padStart(2, "0")}, then apply the benefit.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={confirming}>
                  {confirming ? (
                    <Loader2 className="animate-spin" aria-hidden />
                  ) : (
                    <CheckCircle2 aria-hidden />
                  )}
                  Confirm use
                </Button>
                <Button type="button" variant="outline" onClick={onCancel} disabled={confirming}>
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <Alert>
            <CircleHelp aria-hidden />
            <AlertTitle>You can check vouchers but not confirm their use</AlertTitle>
            <AlertDescription>
              Ask a colleague who may confirm uses. Do not apply the benefit until it is confirmed.
            </AlertDescription>
          </Alert>
        )}
        {expired || !canConfirm ? (
          <Button variant="outline" onClick={onCancel}>
            <ScanLine aria-hidden />
            Scan another voucher
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * The confirmation's response was lost, so it may or may not have been recorded. Retrying
 * with the same key replays the original result; looking the key up returns its receipt, or
 * 404 when the attempt did not commit.
 */
function UnknownOutcome({
  organizationId,
  idempotencyKey,
  retrying,
  retryError,
  onRetry,
  onRecovered,
  onNotRecorded,
}: {
  organizationId: string;
  idempotencyKey: string | null;
  retrying: boolean;
  /** A retry the API answered, e.g. VOUCHER_EXPIRED: the attempt definitely did not commit. */
  retryError: unknown;
  onRetry: () => void;
  onRecovered: (receipt: PartnerReceipt) => void;
  onNotRecorded: () => void;
}) {
  const recover = useRecoverConfirmation(organizationId);
  const notRecorded = recover.error instanceof ApiError && recover.error.isNotFound;
  const busy = retrying || recover.isPending;

  if (notRecorded) {
    return (
      <Card className="max-w-2xl">
        <CardContent className="space-y-4">
          <Alert variant="warning">
            <CircleHelp aria-hidden />
            <AlertTitle>The use was not recorded</AlertTitle>
            <AlertDescription>
              Do not apply the benefit. Scan the voucher again and confirm.
            </AlertDescription>
          </Alert>
          <Button onClick={onNotRecorded}>
            <ScanLine aria-hidden />
            Start again
          </Button>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="max-w-2xl">
      <CardContent className="space-y-4">
        <Alert variant="warning" role="alert">
          <CircleHelp aria-hidden />
          <AlertTitle>We could not tell whether the use was recorded</AlertTitle>
          <AlertDescription>
            The connection dropped before the answer arrived. Check the result before applying the
            benefit; checking or retrying never uses the voucher twice.
          </AlertDescription>
        </Alert>
        {isDefiniteFailure(retryError) ? <VoucherErrorAlert error={retryError} /> : null}
        {recover.isError ? <VoucherErrorAlert error={recover.error} /> : null}
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={busy || !idempotencyKey}
            onClick={() => {
              if (!idempotencyKey) return;
              recover.mutate(idempotencyKey, { onSuccess: onRecovered });
            }}
          >
            {recover.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            Check the result
          </Button>
          <Button variant="outline" disabled={busy} onClick={onRetry}>
            {retrying ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <RotateCcw aria-hidden />
            )}
            Send again
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Confirmed({ receipt, onNext }: { receipt: PartnerReceipt; onNext: () => void }) {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{receipt.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert variant="success" role="status">
          <CheckCircle2 aria-hidden />
          <AlertTitle>Use confirmed: apply the benefit now</AlertTitle>
          <AlertDescription>The voucher is used and cannot be used again.</AlertDescription>
        </Alert>
        <DetailList className="lg:grid-cols-2">
          <ReceiptFacts receipt={receipt} />
        </DetailList>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onNext}>
            <ScanLine aria-hidden />
            Next voucher
          </Button>
          <Button asChild variant="outline">
            <Link href={`/partner/redemptions/${receipt.id}`}>
              <ReceiptText aria-hidden />
              Open receipt
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
