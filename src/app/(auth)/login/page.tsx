import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { LoginForm } from "@/features/identity/components/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="kicker text-muted-foreground">RealHRsoft Marketplace</p>
        <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1] font-semibold tracking-[-0.03em]">
          Welcome back
        </h1>
        <p className="text-muted-foreground text-sm font-medium">
          Sign in to continue where you left off.
        </p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="text-muted-foreground text-center text-sm">
        New here, or didn&apos;t get the email?{" "}
        <Link
          href="/set-password"
          className="text-foreground font-medium underline-offset-4 hover:underline"
        >
          Set up your account
        </Link>
      </p>
    </div>
  );
}
