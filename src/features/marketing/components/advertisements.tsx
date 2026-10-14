"use client";

import {
  Archive,
  Check,
  ClipboardCheck,
  MessageSquareWarning,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  Send,
  Undo2,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/design-system/components/empty-state";
import { PageHeader } from "@/design-system/components/page-header";
import { Button } from "@/design-system/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/design-system/primitives/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/design-system/primitives/dropdown-menu";
import { Input } from "@/design-system/primitives/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/primitives/select";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { NotAPartner, useIsPartner } from "@/features/offers/components/own-offers";
import { PartnerFilter } from "@/features/partners/components/partner-filter";
import { ApiError, errorMessage, isUuid } from "@/shared/api";
import {
  MarketingAdminPermission,
  useCan,
  type GlobalPermissionCode,
} from "@/shared/authorization";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { Detail, DetailList } from "@/shared/components/details";
import { ReasonDialog } from "@/shared/components/reason-dialog";
import { SearchField } from "@/shared/components/search-field";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { useUrlParams } from "@/shared/hooks/use-url-params";
import { formatDateTime } from "@/shared/lib/format";

import {
  useCreateAd,
  useOwnerAdAction,
  useReviewAction,
  useUpdateAd,
  type OwnerAdAction,
  type ReviewAction,
} from "../api/mutations";
import {
  ADMIN_WORKSPACE,
  useAd,
  useAdDecisions,
  useAdRevisions,
  useCampaign,
  useCampaignOptions,
  workspacePath,
  type Advertisement,
  type Campaign,
  type Workspace,
} from "../api/queries";
import { adBody, adValues, EMPTY_AD } from "../schemas/advertisement";
import { OBJECTIVE_LABEL } from "../schemas/campaign";
import { AdPerformance } from "./ad-performance";
import {
  AdDecisionHistory,
  AdRevisionHistory,
  AdRevisions,
  AdStatusCallout,
  adHref,
  BackLink,
  campaignHref,
  isArchivable,
  isEditable,
  isInReview,
  isPausable,
  isResumable,
  isSubmittable,
  isSuspended,
  POSTED_VIA_LABEL,
  windowLabel,
} from "./ad-details";
import { AdForm, type AdIntent, type AdIntentButton } from "./ad-form";
import { AD_STATUSES, AdsTable, NoAds } from "./ads-table";
import { AdvertisingEligibility } from "./advertising-grants";
import { NOT_A_PARTNER } from "./campaigns";
import { usePartnerWorkspace, useWorkspaceCan } from "./workspace";

const ALL = "all";

// --- Directory -------------------------------------------------------------------------

/** Advertisements with their review state; the review queue is ?in_review=true. */
export function AdsDirectory({ workspace }: { workspace: Workspace }) {
  const { searchParams, set } = useUrlParams();
  const search = searchParams.get("search") ?? "";
  const statusParam = searchParams.get("status");
  const status = AD_STATUSES.find((s) => s.value === statusParam)?.value ?? null;
  const inReview = searchParams.get("in_review") === "true" ? true : null;
  const partnerParam = searchParams.get("partner_id");
  const partnerId = partnerParam && isUuid(partnerParam) ? partnerParam : null;
  const campaignParam = searchParams.get("campaign_id");
  const campaignId = campaignParam && isUuid(campaignParam) ? campaignParam : null;
  const canCreate = useWorkspaceCan(workspace, "adManage");
  const admin = workspace.kind === "admin";
  const filtered = Boolean(search || status || inReview || partnerId || campaignId);

  return (
    <div className="space-y-4">
      {workspace.kind === "partner" ? (
        <AdvertisingEligibility organizationId={workspace.organizationId} />
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchField
            placeholder="Search name"
            aria-label="Search advertisements"
            className="max-w-sm"
          />
          <Select
            value={status ?? ALL}
            onValueChange={(value) => set({ status: value === ALL ? null : value })}
          >
            <SelectTrigger className="w-48" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {AD_STATUSES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {admin ? (
            <PartnerFilter value={partnerId} onChange={(id) => set({ partner_id: id })} />
          ) : null}
          <Button
            variant={inReview ? "secondary" : "ghost"}
            aria-pressed={inReview === true}
            onClick={() => set({ in_review: inReview ? null : "true" })}
          >
            <ClipboardCheck aria-hidden />
            Awaiting review
          </Button>
        </div>
        {canCreate ? (
          <Button asChild>
            <Link href={`${workspacePath(workspace)}/advertisements/new`}>
              <Plus aria-hidden />
              New advertisement
            </Link>
          </Button>
        ) : null}
      </div>
      <AdsTable
        workspace={workspace}
        filters={{ search, status, inReview, partnerId, campaignId }}
        empty={
          <NoAds
            title={
              inReview
                ? "Nothing awaiting review"
                : filtered
                  ? "No advertisements found"
                  : "No advertisements yet"
            }
            description={
              filtered
                ? "Try different filters."
                : "Create a campaign, then add advertisements to it."
            }
          />
        }
      />
    </div>
  );
}

export function OwnAds() {
  const workspace = usePartnerWorkspace();
  const isPartner = useIsPartner();
  if (!isPartner) return <NotAPartner description={NOT_A_PARTNER} />;
  return <AdsDirectory workspace={workspace} />;
}

// --- Create ----------------------------------------------------------------------------

/** Save, plus submit when the actor may submit (administrators submit with manage). */
function useAdIntents(workspace: Workspace, saveLabel: string): AdIntentButton[] {
  const canSubmit = useWorkspaceCan(workspace, "adSubmit");
  if (!canSubmit) return [{ intent: "save", label: saveLabel, primary: true }];
  return [
    { intent: "save", label: saveLabel },
    { intent: "submit", label: "Save and submit for review", primary: true },
  ];
}

const intentDone = (intent: AdIntent) =>
  intent === "submit" ? "Saved and submitted for review" : "Draft saved";

/**
 * Creating an advertisement in a campaign. The campaign comes from ?campaign= (linked from the
 * campaign page) or is chosen here; it decides the owner.
 */
export function NewAd({ workspace }: { workspace: Workspace }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const param = searchParams.get("campaign");
  const campaignId = param && isUuid(param) ? param : null;
  return (
    <div className="space-y-6">
      <BackLink href={`${workspacePath(workspace)}/advertisements`} label="Advertisements" />
      {campaignId ? (
        <AdComposer workspace={workspace} campaignId={campaignId} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Which campaign is this advertisement for?</CardTitle>
            <CardDescription>
              {workspace.kind === "admin"
                ? "The campaign's partner owns the advertisement; you create it on their behalf."
                : "Advertisements are filed under a campaign, which schedules them."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CampaignChooser
              workspace={workspace}
              onChoose={(id) => router.replace(`${pathname}?campaign=${encodeURIComponent(id)}`)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function NewOwnAd() {
  const workspace = usePartnerWorkspace();
  const isPartner = useIsPartner();
  if (!isPartner) return <NotAPartner description={NOT_A_PARTNER} />;
  return <NewAd workspace={workspace} />;
}

function CampaignChooser({
  workspace,
  onChoose,
}: {
  workspace: Workspace;
  onChoose: (campaignId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search.trim(), 300);
  const campaigns = useCampaignOptions(workspace, null, debounced);
  const newCampaign = `${workspacePath(workspace)}/campaigns/new`;
  return (
    <div className="space-y-3">
      <Input
        type="search"
        aria-label="Search campaigns"
        placeholder="Search campaigns"
        className="max-w-md"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {campaigns.isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : campaigns.isError ? (
        <p className="text-destructive text-sm">{errorMessage(campaigns.error)}</p>
      ) : campaigns.data.length === 0 ? (
        <EmptyState
          title="No active or paused campaigns"
          description="Create a campaign first."
          action={
            <Button asChild variant="outline">
              <Link href={newCampaign}>New campaign</Link>
            </Button>
          }
          className="py-8"
        />
      ) : (
        <ul className="divide-y rounded-lg border">
          {campaigns.data.slice(0, 20).map((campaign) => (
            <li key={campaign.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{campaign.name}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {workspace.kind === "admin"
                    ? `${campaign.partner?.business_name ?? campaign.owner_organization.name} · `
                    : null}
                  {OBJECTIVE_LABEL[campaign.objective]} ·{" "}
                  {windowLabel(campaign.starts_at, campaign.ends_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge domain="campaign" status={campaign.status} />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onChoose(campaign.id)}
                >
                  Choose
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AdComposer({ workspace, campaignId }: { workspace: Workspace; campaignId: string }) {
  const router = useRouter();
  const campaign = useCampaign(workspace, campaignId);
  const create = useCreateAd(workspace);
  const intents = useAdIntents(workspace, "Save draft");
  if (campaign.isPending) return <Skeleton className="h-96 w-full" />;
  if (campaign.isError) {
    return campaign.error instanceof ApiError && campaign.error.isNotFound ? (
      <EmptyState title="Campaign not found" />
    ) : (
      <ErrorState error={campaign.error} onRetry={() => void campaign.refetch()} />
    );
  }
  if (campaign.data.status === "archived") {
    return <EmptyState title="This campaign is archived" description="Choose another campaign." />;
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>New advertisement</CardTitle>
        <CardDescription>
          Save a draft, or submit it for Aayulogic review. Nothing is served until it is approved.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AdForm
          workspace={workspace}
          partnerId={campaign.data.partner?.id ?? null}
          defaultValues={EMPTY_AD}
          intents={intents}
          reasonHint={
            workspace.kind === "admin"
              ? "Optional note, recorded in the audit log with you as the poster."
              : "Optional note, recorded in the audit log."
          }
          onSubmit={async (values, intent) => {
            const ad = await create.mutateAsync({
              ...adBody(values),
              campaign_id: campaignId,
              intent,
            });
            toast.success(intentDone(intent));
            router.push(adHref(workspace, ad.id));
          }}
        >
          <CampaignSummary workspace={workspace} campaign={campaign.data} />
        </AdForm>
      </CardContent>
    </Card>
  );
}

function CampaignSummary({ workspace, campaign }: { workspace: Workspace; campaign: Campaign }) {
  return (
    <DetailList className="bg-muted/40 rounded-xl p-4">
      <Detail label="Campaign">
        <Link href={campaignHref(workspace, campaign.id)} className="hover:underline">
          {campaign.name}
        </Link>
      </Detail>
      {workspace.kind === "admin" ? (
        <Detail label="Partner">
          {campaign.partner?.business_name ?? campaign.owner_organization.name}
        </Detail>
      ) : null}
      <Detail label="Window">{windowLabel(campaign.starts_at, campaign.ends_at)}</Detail>
    </DetailList>
  );
}

// --- Record ----------------------------------------------------------------------------

export function AdRecord({ workspace, adId }: { workspace: Workspace; adId: string }) {
  const ad = useAd(workspace, adId);
  const back = (
    <BackLink href={`${workspacePath(workspace)}/advertisements`} label="Advertisements" />
  );
  if (ad.isPending) {
    return (
      <div className="space-y-6">
        {back}
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (ad.isError) {
    return (
      <div className="space-y-6">
        {back}
        {ad.error instanceof ApiError && ad.error.isNotFound ? (
          <EmptyState title="Advertisement not found" />
        ) : (
          <ErrorState error={ad.error} onRetry={() => void ad.refetch()} />
        )}
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {back}
      <AdWorkspace workspace={workspace} ad={ad.data} />
    </div>
  );
}

export function OwnAd({ adId }: { adId: string }) {
  const workspace = usePartnerWorkspace();
  const isPartner = useIsPartner();
  if (!isPartner) return <NotAPartner description={NOT_A_PARTNER} />;
  return <AdRecord workspace={workspace} adId={adId} />;
}

interface ActionSpec {
  label: string;
  icon: LucideIcon;
  available: (ad: Advertisement) => boolean;
  title: string;
  description: string;
  confirmLabel: string;
  done: string;
  destructive?: boolean;
}

// Owner actions in priority order: submit is the page's primary button.
const OWNER_ACTIONS: Record<OwnerAdAction, ActionSpec> = {
  submit: {
    label: "Submit for review",
    icon: Send,
    available: isSubmittable,
    title: "Submit for review?",
    description:
      "Aayulogic reviews the draft; it is frozen while it waits, but can be retracted. An approved revision keeps serving meanwhile. Submitting needs advertising to be enabled.",
    confirmLabel: "Submit",
    done: "Submitted for review",
  },
  retract: {
    label: "Retract from review",
    icon: Undo2,
    available: isInReview,
    title: "Retract from review?",
    description:
      "The review stops. The revision stays frozen; edit to start a new draft. An approved revision keeps serving.",
    confirmLabel: "Retract",
    done: "Retracted from review",
    destructive: true,
  },
  resume: {
    label: "Resume",
    icon: Play,
    available: isResumable,
    title: "Resume this advertisement?",
    description:
      "It may serve again while it is approved and its campaign runs. An Aayulogic suspension stays in place.",
    confirmLabel: "Resume",
    done: "Advertisement resumed",
  },
  pause: {
    label: "Pause",
    icon: Pause,
    available: isPausable,
    title: "Pause this advertisement?",
    description: "It stops serving until you resume it. Its review state is unchanged.",
    confirmLabel: "Pause",
    done: "Advertisement paused",
  },
  archive: {
    label: "Archive",
    icon: Archive,
    available: isArchivable,
    title: "Archive this advertisement?",
    description:
      "This is final: it is never served again and cannot be edited. A revision under review is retracted.",
    confirmLabel: "Archive",
    done: "Advertisement archived",
    destructive: true,
  },
};

interface ReviewSpec extends ActionSpec {
  permission: GlobalPermissionCode;
  /** Decisions name the revision under review that the reviewer read. */
  onRevision?: boolean;
  optionalReason?: boolean;
}

const REVIEW_ACTIONS: Record<ReviewAction, ReviewSpec> = {
  approve: {
    label: "Approve",
    icon: Check,
    permission: MarketingAdminPermission.AD_REVIEW,
    available: isInReview,
    onRevision: true,
    optionalReason: true,
    title: "Approve this revision?",
    description:
      "It becomes the approved revision at once, replacing any earlier one. It serves while the campaign runs and the owner has not paused it.",
    confirmLabel: "Approve revision",
    done: "Revision approved",
  },
  reinstate: {
    label: "Reinstate",
    icon: Play,
    permission: MarketingAdminPermission.AD_SUSPEND,
    available: isSuspended,
    title: "Reinstate this advertisement?",
    description: "Lifts the suspension. Owner controls and the review state are unchanged.",
    confirmLabel: "Reinstate",
    done: "Advertisement reinstated",
  },
  "request-changes": {
    label: "Request changes",
    icon: MessageSquareWarning,
    permission: MarketingAdminPermission.AD_REVIEW,
    available: isInReview,
    onRevision: true,
    title: "Request changes?",
    description:
      "The reason tells the owner what to change in a new draft. An approved revision keeps serving.",
    confirmLabel: "Request changes",
    done: "Changes requested",
  },
  reject: {
    label: "Reject",
    icon: X,
    permission: MarketingAdminPermission.AD_REVIEW,
    available: isInReview,
    onRevision: true,
    title: "Reject this revision?",
    description:
      "The reason is shown to the owner. An approved revision keeps serving, and the owner can edit into a new draft.",
    confirmLabel: "Reject revision",
    done: "Revision rejected",
    destructive: true,
  },
  suspend: {
    label: "Suspend",
    icon: Pause,
    permission: MarketingAdminPermission.AD_SUSPEND,
    available: (ad) => !isSuspended(ad) && ad.availability !== "archived",
    title: "Suspend this advertisement?",
    description:
      "It stops serving whatever its owner does; only a reinstatement lifts it. The owner sees your reason.",
    confirmLabel: "Suspend",
    done: "Advertisement suspended",
    destructive: true,
  },
};

type Acting = { kind: "owner"; action: OwnerAdAction } | { kind: "review"; action: ReviewAction };

function useAvailableActions(workspace: Workspace, ad: Advertisement): Acting[] {
  const canSubmit = useWorkspaceCan(workspace, "adSubmit");
  const canManage = useWorkspaceCan(workspace, "adManage");
  const canReview = useCan(MarketingAdminPermission.AD_REVIEW);
  const canSuspend = useCan(MarketingAdminPermission.AD_SUSPEND);
  const owner = (Object.keys(OWNER_ACTIONS) as OwnerAdAction[]).filter((action) => {
    if (!OWNER_ACTIONS[action].available(ad)) return false;
    if (action === "submit" || action === "retract") return canSubmit;
    // Pause, resume and archive are the owner's controls: portal only.
    return workspace.kind === "partner" && canManage;
  });
  const review =
    workspace.kind === "admin"
      ? (Object.keys(REVIEW_ACTIONS) as ReviewAction[]).filter((action) => {
          const spec = REVIEW_ACTIONS[action];
          const granted =
            spec.permission === MarketingAdminPermission.AD_REVIEW ? canReview : canSuspend;
          return granted && spec.available(ad);
        })
      : [];
  return [
    ...review.map((action) => ({ kind: "review" as const, action })),
    ...owner.map((action) => ({ kind: "owner" as const, action })),
  ];
}

const specOf = (acting: Acting): ActionSpec =>
  acting.kind === "owner" ? OWNER_ACTIONS[acting.action] : REVIEW_ACTIONS[acting.action];

const FEEDBACK_PAGE = { offset: 0, limit: 1 };

function AdWorkspace({ workspace, ad }: { workspace: Workspace; ad: Advertisement }) {
  const canManage = useWorkspaceCan(workspace, "adManage");
  const actions = useAvailableActions(workspace, ad);
  const [acting, setActing] = useState<Acting | null>(null);
  // The advertisement the edit started from: a background refetch must not turn a stale draft
  // into an overwrite of someone else's change (the API answers 409 instead).
  const [editingFrom, setEditingFrom] = useState<Advertisement | null>(null);
  const intents = useAdIntents(workspace, "Save draft");
  const latest = useAdDecisions(workspace, ad.id, FEEDBACK_PAGE);
  const declined =
    ad.working_revision?.state === "changes_requested" || ad.working_revision?.state === "rejected";
  const feedback = declined ? (latest.data?.results[0]?.reason ?? undefined) : undefined;

  // Two buttons at most; the rest go in the menu. Only a non-destructive first is lime.
  const [primary, secondary, ...menu] = actions;

  return (
    <>
      <PageHeader
        title={ad.name}
        description={
          <span className="flex flex-wrap items-center gap-x-2">
            <Link href={campaignHref(workspace, ad.campaign.id)} className="hover:underline">
              {ad.campaign.name}
            </Link>
            {workspace.kind === "admin" ? (
              <>
                <span aria-hidden>·</span>
                {ad.owner_organization.name}
              </>
            ) : null}
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge domain="advertisement" status={ad.display_status} />
            {secondary ? (
              <ActionButton acting={secondary} onClick={() => setActing(secondary)} />
            ) : null}
            {primary ? (
              <ActionButton
                acting={primary}
                primary={!specOf(primary).destructive}
                onClick={() => setActing(primary)}
              />
            ) : null}
            {menu.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="More actions">
                    <MoreHorizontal aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {menu.map((item) => {
                    const spec = specOf(item);
                    return (
                      <DropdownMenuItem key={item.action} onSelect={() => setActing(item)}>
                        <spec.icon aria-hidden />
                        {spec.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        }
      />
      <AdStatusCallout
        ad={ad}
        audience={workspace.kind === "admin" ? "reviewer" : "partner"}
        feedback={feedback}
      />
      {editingFrom ? (
        <AdEditor
          workspace={workspace}
          ad={editingFrom}
          intents={intents}
          onDone={() => setEditingFrom(null)}
        />
      ) : (
        <AdRevisions
          workspace={workspace}
          ad={ad}
          editAction={
            canManage && isEditable(ad) ? (
              <Button variant="outline" size="sm" onClick={() => setEditingFrom(ad)}>
                <Pencil aria-hidden />
                Edit
              </Button>
            ) : null
          }
        />
      )}
      <Card>
        <CardHeader>
          <CardTitle>Record</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailList>
            <Detail label="Campaign">
              <span className="flex flex-wrap items-center gap-2">
                <Link href={campaignHref(workspace, ad.campaign.id)} className="hover:underline">
                  {ad.campaign.name}
                </Link>
                <StatusBadge domain="campaign" status={ad.campaign.status} />
              </span>
            </Detail>
            <Detail label="Owner">{ad.owner_organization.name}</Detail>
            <Detail label="Posted via">{POSTED_VIA_LABEL[ad.posted_via]}</Detail>
            <Detail label="First approved">
              {ad.first_approved_at ? formatDateTime(ad.first_approved_at) : "Never"}
            </Detail>
            {ad.archived_at ? (
              <Detail label="Archived">{formatDateTime(ad.archived_at)}</Detail>
            ) : null}
            <Detail label="Created">{formatDateTime(ad.created_at)}</Detail>
          </DetailList>
        </CardContent>
      </Card>
      {ad.first_approved_at ? <AdPerformance workspace={workspace} adId={ad.id} /> : null}
      <Revisions workspace={workspace} adId={ad.id} />
      <Decisions workspace={workspace} adId={ad.id} />
      <ActionDialogs
        workspace={workspace}
        ad={ad}
        acting={acting}
        onClose={() => setActing(null)}
      />
    </>
  );
}

/**
 * Editing from the advertisement the edit started from. Administrators upload images and pick
 * offers for the owner's partner, which comes from the campaign.
 */
function AdEditor({
  workspace,
  ad,
  intents,
  onDone,
}: {
  workspace: Workspace;
  ad: Advertisement;
  intents: readonly AdIntentButton[];
  onDone: () => void;
}) {
  return workspace.kind === "admin" ? (
    <AdminAdEditor ad={ad} intents={intents} onDone={onDone} />
  ) : (
    <AdEditCard workspace={workspace} ad={ad} partnerId={null} intents={intents} onDone={onDone} />
  );
}

function AdminAdEditor({
  ad,
  intents,
  onDone,
}: {
  ad: Advertisement;
  intents: readonly AdIntentButton[];
  onDone: () => void;
}) {
  const campaign = useCampaign(ADMIN_WORKSPACE, ad.campaign.id);
  if (campaign.isPending) return <Skeleton className="h-96 w-full" />;
  if (campaign.isError)
    return <ErrorState error={campaign.error} onRetry={() => void campaign.refetch()} />;
  return (
    <AdEditCard
      workspace={ADMIN_WORKSPACE}
      ad={ad}
      partnerId={campaign.data.partner?.id ?? null}
      intents={intents}
      onDone={onDone}
    />
  );
}

function AdEditCard({
  workspace,
  ad,
  partnerId,
  intents,
  onDone,
}: {
  workspace: Workspace;
  ad: Advertisement;
  partnerId: string | null;
  intents: readonly AdIntentButton[];
  onDone: () => void;
}) {
  const update = useUpdateAd(workspace, ad.id);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit advertisement</CardTitle>
        <CardDescription>
          Saving replaces the working draft, or starts one.{" "}
          {ad.current_revision
            ? `Approved revision ${ad.current_revision.number} keeps serving until the new one is approved.`
            : "Submit it when it is ready for review."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AdForm
          workspace={workspace}
          partnerId={partnerId}
          defaultValues={adValues(ad)}
          intents={intents}
          reasonHint="Optional note, recorded in the audit log."
          onCancel={onDone}
          onSubmit={async (values, intent) => {
            await update.mutateAsync({
              ...adBody(values),
              intent,
              expected_version: ad.version,
            });
            toast.success(intentDone(intent));
            onDone();
          }}
        />
      </CardContent>
    </Card>
  );
}

function ActionButton({
  acting,
  primary = false,
  onClick,
}: {
  acting: Acting;
  primary?: boolean;
  onClick: () => void;
}) {
  const spec = specOf(acting);
  return (
    <Button variant={primary ? "default" : "outline"} onClick={onClick}>
      <spec.icon aria-hidden />
      {spec.label}
    </Button>
  );
}

function Revisions({ workspace, adId }: { workspace: Workspace; adId: string }) {
  const paging = usePageParam("revisions_");
  return <AdRevisionHistory revisions={useAdRevisions(workspace, adId, paging)} paging={paging} />;
}

function Decisions({ workspace, adId }: { workspace: Workspace; adId: string }) {
  const paging = usePageParam("decisions_");
  return <AdDecisionHistory decisions={useAdDecisions(workspace, adId, paging)} paging={paging} />;
}

/**
 * Administrator decisions carry an audited reason (optional for approve, submit and retract);
 * the owner's own controls only confirm.
 */
function ActionDialogs({
  workspace,
  ad,
  acting,
  onClose,
}: {
  workspace: Workspace;
  ad: Advertisement;
  acting: Acting | null;
  onClose: () => void;
}) {
  const owner = useOwnerAdAction(workspace, ad.id);
  const review = useReviewAction(ad.id);
  const spec = acting ? specOf(acting) : OWNER_ACTIONS.submit;
  const admin = workspace.kind === "admin";

  if (acting?.kind === "review" || (admin && acting)) {
    const reviewSpec = acting.kind === "review" ? REVIEW_ACTIONS[acting.action] : null;
    return (
      <ReasonDialog
        open
        onOpenChange={(open) => !open && onClose()}
        title={spec.title}
        description={spec.description}
        confirmLabel={spec.confirmLabel}
        destructive={spec.destructive}
        optional={reviewSpec ? reviewSpec.optionalReason : true}
        onConfirm={async (reason) => {
          if (acting.kind === "review") {
            await review.mutateAsync({
              action: acting.action,
              reason,
              expected_version: ad.version,
              revision_id: REVIEW_ACTIONS[acting.action].onRevision
                ? ad.working_revision?.id
                : undefined,
            });
          } else {
            await owner.mutateAsync({
              action: acting.action,
              reason,
              expected_version: ad.version,
            });
          }
          toast.success(spec.done);
        }}
      />
    );
  }
  return (
    <ConfirmDialog
      open={acting !== null}
      onOpenChange={(open) => !open && onClose()}
      title={spec.title}
      description={spec.description}
      confirmLabel={spec.confirmLabel}
      destructive={spec.destructive}
      onConfirm={async () => {
        if (acting?.kind !== "owner") return;
        await owner.mutateAsync({
          action: acting.action,
          reason: "",
          expected_version: ad.version,
        });
        toast.success(spec.done);
      }}
    />
  );
}

// --- Administrator entry points ---------------------------------------------------------

export function AdminAds() {
  return <AdsDirectory workspace={ADMIN_WORKSPACE} />;
}

export function AdminNewAd() {
  return <NewAd workspace={ADMIN_WORKSPACE} />;
}

export function AdminAd({ adId }: { adId: string }) {
  return <AdRecord workspace={ADMIN_WORKSPACE} adId={adId} />;
}
