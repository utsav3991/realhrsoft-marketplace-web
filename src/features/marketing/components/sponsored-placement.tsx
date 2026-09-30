"use client";

import { ArrowUpRight, Megaphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/design-system/primitives/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/design-system/primitives/card";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { ApiError } from "@/shared/api";
import { cn } from "@/shared/lib/cn";

import { reportRendered, useFollowAd } from "../api/mutations";
import {
  isCreativeChanged,
  usePlacement,
  useServedAdImage,
  type ServedAd,
} from "../api/queries";

/** Placement slots the web app renders (keys never change; see the slot catalogue). */
export const SLOTS = {
  /** App-wide banner on every portal's home page, served to every signed-in user. */
  appHomeTop: "app.home.top",
  homeTop: "marketplace.home.top",
  categoryTop: "marketplace.category.top",
  offersInline: "marketplace.offers.inline",
} as const;

/**
 * Static aspect classes for the slot shapes in the catalogue (Tailwind needs literal class
 * names). Slots with another ratio fall back to 2:1 and the image is cropped to fill it.
 */
const ASPECTS: Readonly<Record<string, string>> = {
  "4/1": "aspect-[4/1]",
  "3/1": "aspect-[3/1]",
  "2/1": "aspect-[2/1]",
  "16/9": "aspect-video",
  "1/1": "aspect-square",
};

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export function aspectClass(width: number, height: number): string {
  const divisor = gcd(width, height) || 1;
  return ASPECTS[`${width / divisor}/${height / divisor}`] ?? "aspect-[2/1]";
}

/** Share of an advertisement that must be on screen before it counts as rendered. */
const VISIBLE_SHARE = 0.5;

/**
 * Reports the advertisement as rendered the first time its creative is ready and at least half
 * on screen. A skeleton, an image still downloading or one that failed to decode is not the
 * reviewed creative, so observation starts only once `ready`. The API counts it once per
 * viewer and day, so remounts only cost a request.
 */
function useRenderedBeacon(ad: ServedAd, slotKey: string, ready: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const { id, revision_id } = ad;
  useEffect(() => {
    const element = ref.current;
    if (!ready || !element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.intersectionRatio >= VISIBLE_SHARE)) {
          reportRendered({ id, revision_id }, slotKey);
          observer.disconnect();
        }
      },
      { threshold: VISIBLE_SHARE },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [id, revision_id, slotKey, ready]);
  return ref;
}

/**
 * The served image and whether it has loaded and decoded. Readiness belongs to the revision
 * and image that loaded, so a new revision starts unready even when it reuses the image.
 */
function useCreativeImage(ad: ServedAd, slotKey: string) {
  const image = useServedAdImage(ad, slotKey);
  const [loaded, setLoaded] = useState<string | null>(null);
  const shown = image.data === undefined ? null : `${ad.revision_id} ${image.data}`;
  return {
    image,
    loaded: shown !== null && loaded === shown,
    onLoad: () => setLoaded(shown),
  };
}

/** Only links the API builds are followed, and only in the shapes it documents. */
function isAppPath(url: string) {
  return url.startsWith("/marketplace/") && !url.startsWith("//");
}

function useFollow(ad: ServedAd, slotKey: string) {
  const router = useRouter();
  const follow = useFollowAd(slotKey);
  return {
    pending: follow.isPending,
    onFollow: () => {
      // External links open in a new tab. It is opened now, inside the click, because popup
      // blockers refuse a window opened after the request resolves.
      const tab = ad.link_target === "external" ? window.open("", "_blank") : null;
      if (tab) tab.opener = null;
      follow.mutate(ad, {
        onSuccess: (link) => {
          if (link.target === "internal" && isAppPath(link.url)) {
            tab?.close();
            router.push(link.url);
          } else if (link.target === "external" && link.url.startsWith("https://")) {
            if (tab) tab.location.href = link.url;
            else window.location.assign(link.url);
          } else {
            tab?.close();
          }
        },
        onError: (error) => {
          tab?.close();
          toast.info(
            isCreativeChanged(error)
              ? "This promotion was just updated. Take a look at the new version."
              : error instanceof ApiError && error.isNotFound
                ? "This promotion is no longer available."
                : "The promotion could not be opened. Try again.",
          );
        },
      });
    },
  };
}

function SponsoredLabel({ ad }: { ad: ServedAd }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Badge intent="neutral">
        <Megaphone aria-hidden />
        Sponsored
      </Badge>
      <span className="text-muted-foreground truncate text-xs">{ad.sponsor}</span>
    </span>
  );
}

const DEFAULT_CTA: Record<ServedAd["destination_type"], string> = {
  external_url: "Visit",
  offer: "View offer",
  ad_page: "Learn more",
};

function callToAction(ad: ServedAd) {
  return ad.cta_label || DEFAULT_CTA[ad.destination_type];
}

function BannerAd({ ad, slotKey, aspect }: { ad: ServedAd; slotKey: string; aspect: string }) {
  const { image, loaded, onLoad } = useCreativeImage(ad, slotKey);
  const beacon = useRenderedBeacon(ad, slotKey, loaded);
  const { pending, onFollow } = useFollow(ad, slotKey);
  const label = ad.headline || ad.alt_text;
  return (
    <div ref={beacon} className="w-full shrink-0 snap-center space-y-2">
      <SponsoredLabel ad={ad} />
      <button
        type="button"
        onClick={onFollow}
        disabled={pending}
        aria-label={`Sponsored: ${label}. ${callToAction(ad)}`}
        className={cn(
          "focus-visible:ring-ring block w-full overflow-hidden rounded-2xl border focus-visible:ring-2 focus-visible:outline-none disabled:opacity-70",
          aspect,
        )}
      >
        {image.data ? (
          // A data: URL of a private, reviewed image; next/image cannot optimize it.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.data}
            alt={ad.alt_text}
            onLoad={onLoad}
            className="size-full object-cover"
          />
        ) : image.isError ? (
          <span className="bg-muted flex size-full items-center justify-center p-4 text-sm font-medium">
            {label}
          </span>
        ) : (
          <Skeleton className="size-full rounded-none" />
        )}
      </button>
    </div>
  );
}

function CardAd({ ad, slotKey, aspect }: { ad: ServedAd; slotKey: string; aspect: string }) {
  const { image, loaded, onLoad } = useCreativeImage(ad, slotKey);
  // A text card is complete as soon as it renders; an image card needs its image.
  const beacon = useRenderedBeacon(ad, slotKey, !ad.has_image || loaded);
  const { pending, onFollow } = useFollow(ad, slotKey);
  return (
    <div ref={beacon} className="h-full">
      {/* Tinted and labelled so it never reads as one of the offers around it. */}
      <Card className="bg-muted flex h-full flex-col overflow-hidden border-dashed">
        {ad.has_image ? (
          <div className={cn("border-b", aspect)}>
            {image.data ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image.data}
                alt={ad.alt_text}
                onLoad={onLoad}
                className="size-full object-cover"
              />
            ) : (
              <Skeleton className="size-full rounded-none" />
            )}
          </div>
        ) : null}
        <CardHeader className="gap-2">
          <SponsoredLabel ad={ad} />
          {ad.headline ? <CardTitle className="text-lg">{ad.headline}</CardTitle> : null}
          {ad.body ? <CardDescription>{ad.body}</CardDescription> : null}
        </CardHeader>
        <div className="mt-auto px-6 pb-6">
          <button
            type="button"
            onClick={onFollow}
            disabled={pending}
            className="text-primary inline-flex items-center gap-1 text-sm font-semibold hover:underline disabled:opacity-70"
          >
            {callToAction(ad)}
            <ArrowUpRight className="size-4" aria-hidden />
          </button>
        </div>
      </Card>
    </div>
  );
}

/**
 * A full-width banner slot above marketplace content. Several advertisements scroll
 * horizontally, one per view. Renders nothing while loading fails or nothing is eligible.
 */
export function SponsoredBanner({ slotKey, className }: { slotKey: string; className?: string }) {
  const placement = usePlacement(slotKey);
  const ads = placement.data?.ads ?? [];
  if (ads.length === 0 || !placement.data) return null;
  const { width, height } = placement.data.slot;
  return (
    <section aria-label="Sponsored" className={cn("space-y-2", className)}>
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto">
        {ads.map((ad) => (
          <BannerAd key={ad.id} ad={ad} slotKey={slotKey} aspect={aspectClass(width, height)} />
        ))}
      </div>
    </section>
  );
}

/**
 * Sponsored cards for a grid of offer cards: returns one grid item per advertisement, so the
 * caller places them among its own results.
 */
export function useSponsoredCards(slotKey: string) {
  const placement = usePlacement(slotKey);
  const slot = placement.data?.slot;
  return (placement.data?.ads ?? []).map((ad) => (
    <CardAd
      key={`sponsored-${ad.id}`}
      ad={ad}
      slotKey={slotKey}
      aspect={slot ? aspectClass(slot.width, slot.height) : "aspect-[2/1]"}
    />
  ));
}
