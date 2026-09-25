"use client";

import { CircleCheck, Info, Loader2, OctagonX, TriangleAlert } from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/** Mount once (app/providers). Call `toast` from "sonner" to show a notification. */
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="system"
      icons={{
        success: <CircleCheck className="text-success size-4" aria-hidden />,
        info: <Info className="size-4" aria-hidden />,
        warning: <TriangleAlert className="text-warning size-4" aria-hidden />,
        error: <OctagonX className="text-destructive size-4" aria-hidden />,
        loading: <Loader2 className="size-4 animate-spin" aria-hidden />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "bg-popover text-popover-foreground flex w-full items-start gap-3 rounded-xl border p-4 text-sm shadow-panel sm:w-(--width)",
          title: "font-medium",
          description: "text-muted-foreground",
          icon: "mt-0.5",
        },
      }}
      {...props}
    />
  );
}
