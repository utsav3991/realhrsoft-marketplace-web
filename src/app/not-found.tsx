import { FileQuestion } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/design-system/components/empty-state";
import { Button } from "@/design-system/primitives/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <EmptyState
        icon={FileQuestion}
        title="Page not found"
        description="The page you were looking for doesn't exist or has moved."
        action={
          <Button asChild variant="outline">
            <Link href="/">Go to your workspace</Link>
          </Button>
        }
      />
    </main>
  );
}
