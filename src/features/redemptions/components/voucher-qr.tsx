"use client";

import { useQueryClient } from "@tanstack/react-query";
import { EyeOff, Loader2, QrCode as QrCodeIcon, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/design-system/primitives/button";
import { claimKeys } from "@/features/claims/api/queries";
import { QrCode } from "@/shared/components/qr-code";

import { useShowVoucherQr } from "../api/mutations";
import { useMyVoucher, type Credential } from "../api/queries";

import { VoucherErrorAlert } from "./redemption-details";

// While the QR is up the voucher is re-read this often, so the owner sees the partner's
// confirmation. Reads are not throttled; issuing a QR is (per user), so it never auto-refreshes.
const USE_POLL_MS = 4000;

/** The clock while the QR is up; `sync` restarts it when a new QR arrives. */
function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return [now, () => setNow(Date.now())] as const;
}

function countdown(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * The owner's QR for a usable voucher. The payload is a bearer secret for a few minutes: it is
 * kept in this component's state only (never stored, logged or put in a URL) and dropped when
 * it expires, when the voucher is used, or when the owner hides it.
 */
export function VoucherQr({ voucherId, reference }: { voucherId: string; reference: string }) {
  const show = useShowVoucherQr(voucherId);
  const [credential, setCredential] = useState<Credential | null>(null);
  const [now, syncNow] = useNow(credential !== null);
  const remaining = credential ? new Date(credential.expires_at).getTime() - now : 0;

  const voucher = useMyVoucher(voucherId, {
    enabled: credential !== null && remaining > 0,
    refetchInterval: USE_POLL_MS,
  });
  const status = voucher.data?.status;
  // The partner confirmed (or Aayulogic withdrew) the voucher while its QR was up.
  const settled = credential !== null && status !== undefined && status !== "available";
  const visible = credential !== null && remaining > 0 && !settled;
  const lapsed = credential !== null && remaining <= 0 && !settled;

  const queryClient = useQueryClient();
  const announced = useRef<Credential | null>(null);
  useEffect(() => {
    if (!settled || announced.current === credential) return;
    announced.current = credential;
    if (status === "used") toast.success("Your voucher was used");
    void queryClient.invalidateQueries({ queryKey: claimKeys.mine() });
  }, [settled, credential, status, queryClient]);

  async function issue() {
    try {
      const issued = await show.mutateAsync();
      syncNow();
      setCredential(issued);
    } catch {
      // Shown below. A refused request replaces nothing, so a QR still on screen stays valid.
    }
  }

  if (!credential || !visible) {
    return (
      <div className="flex flex-col items-start gap-3">
        {show.isError ? <VoucherErrorAlert error={show.error} /> : null}
        <p className="text-muted-foreground text-sm font-medium">
          {lapsed
            ? "The QR code expired. Show a new one when you are at the counter."
            : "Show the QR code at the counter. It works for a few minutes; show a new one if it expires."}
        </p>
        <Button onClick={() => void issue()} disabled={show.isPending}>
          {show.isPending ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : (
            <QrCodeIcon aria-hidden />
          )}
          {lapsed ? "Show a new QR code" : "Show QR code"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {show.isError ? <VoucherErrorAlert error={show.error} /> : null}
      <QrCode
        value={credential.qr_payload}
        label="Voucher QR code for the partner to scan"
        className="size-64"
      />
      <div className="space-y-1">
        <p className="text-sm font-semibold" aria-live="polite">
          Expires in {countdown(remaining)}
        </p>
        <p className="text-muted-foreground text-xs font-medium">
          Whoever shows this code can use your voucher, so do not share screenshots. If it will not
          scan, the cashier can type <span className="font-mono font-bold">{reference}</span>.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="outline" onClick={() => void issue()} disabled={show.isPending}>
          {show.isPending ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : (
            <RefreshCw aria-hidden />
          )}
          New code
        </Button>
        <Button variant="ghost" onClick={() => setCredential(null)}>
          <EyeOff aria-hidden />
          Hide
        </Button>
      </div>
    </div>
  );
}
