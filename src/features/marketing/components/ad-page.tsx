"use client";

import { ArrowLeft, ArrowUpRight, Megaphone, RefreshCw } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { EmptyState } from "@/design-system/components/empty-state";
import { Badge } from "@/design-system/primitives/badge";
import { Button } from "@/design-system/primitives/button";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { ApiError } from "@/shared/api";
import { ErrorState } from "@/shared/feedback/states";
import { cn } from "@/shared/lib/cn";

import { isCreativeChanged, useAdPage, useServedAdImage, type AdPage } from "../api/queries";
import { DEFAULT_ACTION_LABEL } from "../schemas/advertisement";

/**
 * An advertisement's own page. The same layout renders the employee's page and the preview
 * on the owner's and reviewer's record, so what is reviewed is what employees see. Title and
 * body are plain text, rendered as text nodes with their line breaks.
 */
export function AdPageView({
  sponsor,
  title,
  body,
  image,
  action,
  preview = false,
}: {
  sponsor: string;
  title: string;
  body: string;
  /** The creative's image, or null for a text creative. */
  image: ReactNode;
  action: ReactNode;
  /** Inside a record: the title is not the document's h1. */
  preview?: boolean;
}) {
  const Title = preview ? "h3" : "h1";
  return (
    <article className="space-y-6">
      <p className="flex min-w-0 flex-wrap items-center gap-2">
        <Badge intent="neutral">
          <Megaphone aria-hidden />
          Sponsored
        </Badge>
        <span className="text-muted-foreground truncate text-sm">{sponsor}</span>
      </p>
      {image ? <div className="overflow-hidden rounded-2xl border">{image}</div> : null}
      <Title
        className={cn(
          "leading-[1.1] font-semibold tracking-[-0.03em]",
          preview ? "text-xl" : "text-[clamp(1.5rem,2.5vw,2rem)]",
        )}
      >
        {title}
      </Title>
      <p className="max-w-3xl text-base font-medium whitespace-pre-line">{body}</p>
      {action ? <div>{action}</div> : null}
    </article>
  );
}

// --- Employee page -----------------------------------------------------------------------

function BackToMarketplace() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-3">
      <Link href="/marketplace">
        <ArrowLeft aria-hidden />
        Discover
      </Link>
    </Button>
  );
}

/** Only links the API builds are followed, and only in the shapes it documents. */
function PageActionButton({ action }: { action: NonNullable<AdPage["action"]> }) {
  const content = (label: string) => (
    <>
      {action.label || label}
      <ArrowUpRight aria-hidden />
    </>
  );
  if (action.target === "internal" && action.url.startsWith("/marketplace/") && !action.url.startsWith("//")) {
    return (
      <Button asChild variant="ink" size="lg">
        <Link href={action.url}>{content(DEFAULT_ACTION_LABEL.offer)}</Link>
      </Button>
    );
  }
  if (action.target === "external" && action.url.startsWith("https://")) {
    return (
      <Button asChild variant="ink" size="lg">
        <a href={action.url} target="_blank" rel="noopener noreferrer">
          {content(DEFAULT_ACTION_LABEL.external_url)}
        </a>
      </Button>
    );
  }
  return null;
}

function ServedImage({ page, slotKey }: { page: AdPage; slotKey: string }) {
  const image = useServedAdImage(page, slotKey);
  if (image.isError) return null;
  if (!image.data) return <Skeleton className="aspect-[4/1] w-full rounded-none" />;
  // A data: URL of a private, reviewed image; next/image cannot optimize it.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={image.data} alt={page.alt_text} className="max-h-[28rem] w-full object-cover" />;
}

/**
 * The page an employee opens from an advertisement whose destination is its own page. It is
 * reached from a click with the slot and revision served, and shows exactly that revision.
 */
export function ServedAdPage({
  adId,
  slotKey,
  revisionId,
}: {
  adId: string;
  slotKey: string;
  revisionId: string;
}) {
  const page = useAdPage(adId, slotKey, revisionId);

  if (page.isPending) {
    return (
      <div className="space-y-6">
        <BackToMarketplace />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="aspect-[4/1] w-full" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-24 w-full max-w-3xl" />
      </div>
    );
  }
  if (page.isError) {
    return (
      <div className="space-y-6">
        <BackToMarketplace />
        {isCreativeChanged(page.error) ? (
          <EmptyState
            icon={RefreshCw}
            title="This promotion was updated"
            description="Open it again from the marketplace to see the latest version."
          />
        ) : page.error instanceof ApiError && page.error.isNotFound ? (
          <EmptyState
            icon={Megaphone}
            title="Promotion not available"
            description="It may have ended or been paused."
          />
        ) : (
          <ErrorState error={page.error} onRetry={() => void page.refetch()} />
        )}
      </div>
    );
  }

  const { data } = page;
  return (
    <div className="space-y-6">
      <BackToMarketplace />
      <AdPageView
        sponsor={data.sponsor}
        title={data.title}
        body={data.body}
        image={data.has_image ? <ServedImage page={data} slotKey={slotKey} /> : null}
        action={data.action ? <PageActionButton action={data.action} /> : null}
      />
    </div>
  );
}
