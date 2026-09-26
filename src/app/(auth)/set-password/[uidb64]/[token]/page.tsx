import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SetPasswordForm } from "@/features/identity/components/set-password-form";
import { isPathToken } from "@/shared/api";

export const metadata: Metadata = { title: "Set your password" };

/** Target of the invitation email: {FRONTEND_URL}/set-password/{uidb64}/{token}. */
export default async function SetPasswordPage({
  params,
}: {
  params: Promise<{ uidb64: string; token: string }>;
}) {
  const { uidb64, token } = await params;
  if (!isPathToken(uidb64) || !isPathToken(token)) notFound();
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="kicker text-muted-foreground">RealHRsoft Marketplace</p>
        <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1] font-semibold tracking-[-0.03em]">
          Set your password
        </h1>
      </div>
      <SetPasswordForm uidb64={uidb64} token={token} />
    </div>
  );
}
