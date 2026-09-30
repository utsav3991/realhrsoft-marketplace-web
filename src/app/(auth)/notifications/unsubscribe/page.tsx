import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { UnsubscribeConfirm } from "@/features/notifications/components/unsubscribe-confirm";

export const metadata: Metadata = {
  title: "Unsubscribe from emails",
  // The token is a credential for this one action: keep it out of referrers.
  referrer: "no-referrer",
};

/** Target of every notification email's link: {FRONTEND_URL}/notifications/unsubscribe?token=… */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  if (typeof token !== "string" || token.length === 0 || token.length > 500) notFound();
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="kicker text-muted-foreground">RealHRsoft Marketplace</p>
        <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1] font-semibold tracking-[-0.03em]">
          Unsubscribe from emails
        </h1>
      </div>
      <UnsubscribeConfirm token={token} />
    </div>
  );
}
