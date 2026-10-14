import type { ReactNode } from "react";

import { FadeIn } from "@/design-system/components/motion";

/** Split screen as in the SHMS frontend: the form on one half, a lime brand panel on the other. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh overflow-hidden md:grid-cols-2">
      <main className="flex items-center justify-center p-6 md:p-12">
        <FadeIn className="w-full max-w-md">{children}</FadeIn>
      </main>
      <aside className="bg-primary text-primary-foreground relative hidden items-center justify-center overflow-hidden p-12 md:flex">
        <div
          className="from-primary-foreground/25 via-primary-foreground/5 absolute inset-0 bg-linear-to-t to-transparent"
          aria-hidden
        />
        <div className="relative flex max-w-lg flex-col gap-6 p-10">
          <p className="kicker">RealHRsoft Marketplace</p>
          <h2 className="text-primary-foreground text-4xl leading-tight font-extrabold tracking-tight sm:text-5xl">
            Offers and benefits for every employee
          </h2>
          <p className="text-primary-foreground/80 text-lg leading-relaxed font-medium">
            Partners publish offers, employers run company benefits, and employees claim them in one
            place.
          </p>
          <div className="bg-primary-foreground h-1.5 w-16 rounded-full" aria-hidden />
        </div>
      </aside>
    </div>
  );
}
