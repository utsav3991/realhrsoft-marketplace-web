import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/design-system/primitives/card";
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
    <main className="bg-muted/40 flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Set your password</CardTitle>
          <CardDescription>RealHRsoft Marketplace</CardDescription>
        </CardHeader>
        <CardContent>
          <SetPasswordForm uidb64={uidb64} token={token} />
        </CardContent>
      </Card>
    </main>
  );
}
