import type { Metadata } from "next";
import Link from "next/link";

import { RequestSetupLinkForm } from "@/features/identity/components/request-setup-link-form";

export const metadata: Metadata = { title: "Set up your account" };

/**
 * For accounts that have no password yet (created by an administrator or for a client,
 * company or merchant): they cannot sign in, so they ask for a new set-password link here.
 */
export default function RequestSetupLinkPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="kicker text-muted-foreground">RealHRsoft Marketplace</p>
        <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1] font-semibold tracking-[-0.03em]">
          Set up your account
        </h1>
        <p className="text-muted-foreground text-sm font-medium">
          Didn&apos;t get the email, or did the link expire? We&apos;ll send a new one.
        </p>
      </div>
      <RequestSetupLinkForm />
      <p className="text-muted-foreground text-center text-sm">
        Already set a password?{" "}
        <Link
          href="/login"
          className="text-foreground font-medium underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
