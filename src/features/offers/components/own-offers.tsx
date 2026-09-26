"use client";

import { ArrowLeft, Lock, Pencil, Plus, Send, ShieldAlert, Tag, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { type DataTableColumns } from "@/design-system/components/data-table";
import { EmptyState } from "@/design-system/components/empty-state";
import { PageHeader } from "@/design-system/components/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/design-system/primitives/alert";
import { Button } from "@/design-system/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/design-system/primitives/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/primitives/select";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { useOwnPartner } from "@/features/partners/api/queries";
import { ApiError } from "@/shared/api";
import { useSelectedOrganizationId, useSession } from "@/shared/auth";
import {
  PartnerOfferPermission,
  PartnerPermission,
  useCanInOrganization,
} from "@/shared/authorization";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { QueryDataTable, type RowOf } from "@/shared/components/query-data-table";
import { useSortParam } from "@/shared/hooks/use-sort-param";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";
import { formatDate } from "@/shared/lib/format";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { useUrlParams } from "@/shared/hooks/use-url-params";

import {
  useCreateOwnOffer,
  useSubmitOwnOffer,
  useUpdateOwnOffer,
  useWithdrawOwnOffer,
} from "../api/mutations";
import {
  OWN_OFFER_SORTS,
  useOwnOffer,
  useOwnOfferDecisions,
  useOwnOffers,
  type Offer,
} from "../api/queries";
import { EMPTY_OFFER, offerBody, offerValues } from "../schemas/offer";
import { useOwnCategoryOptions } from "./category-options";
import {
  isEditable,
  isSubmittable,
  isWithdrawable,
  OfferContentCard,
  OfferDecisionHistory,
  OfferStatusCallout,
  PublicationCard,
  RedemptionCard,
  VisibilityBadge,
} from "./offer-details";
import { OfferForm, type IntentButton } from "./offer-form";
import { OFFER_STATUSES } from "./offers-directory";

const ALL = "all";

/** Whether the selected organization has a partner registration (any status). */
export function useIsPartner(): boolean {
  const { actor } = useSession();
  const organizationId = useSelectedOrganizationId();
  return Boolean(actor?.memberships.find((m) => m.organizationId === organizationId)?.partner);
}

export function NotAPartner({
  description = "Register the business and pass Aayulogic verification before posting offers.",
}: {
  description?: string;
}) {
  return (
    <EmptyState
      icon={Lock}
      title="Your organization is not a partner yet"
      description={description}
      action={
        <Button asChild variant="outline">
          <Link href="/partner">Open the partner dashboard</Link>
        </Button>
      }
    />
  );
}

/**
 * Offers can be created, submitted and published only for a verified partner. The status is
 * read when the member may view the profile; otherwise the API's answer is shown on save.
 */
function VerificationNotice() {
  const organizationId = useSelectedOrganizationId();
  const canViewProfile = useCanInOrganization(PartnerPermission.PROFILE_VIEW);
  const partner = useOwnPartner(organizationId, { enabled: canViewProfile });
  if (!partner.isSuccess || partner.data.status === "verified") return null;
  return (
    <Alert>
      <ShieldAlert aria-hidden />
      <AlertTitle>Verification needed</AlertTitle>
      <AlertDescription>
        Your partner registration is {partner.data.status}. Offers can be created and submitted once
        Aayulogic verifies it; existing offers stay hidden from employees until then.
      </AlertDescription>
    </Alert>
  );
}

function useIsVerified(): boolean | null {
  const organizationId = useSelectedOrganizationId();
  const canViewProfile = useCanInOrganization(PartnerPermission.PROFILE_VIEW);
  const partner = useOwnPartner(organizationId, { enabled: canViewProfile });
  return partner.isSuccess ? partner.data.status === "verified" : null;
}

/** The selected partner organization's offers. */
export function OwnOffers() {
  const { searchParams, set } = useUrlParams();
  const organizationId = useSelectedOrganizationId();
  const isPartner = useIsPartner();
  const statusParam = searchParams.get("status");
  const status = OFFER_STATUSES.find((s) => s.value === statusParam)?.value ?? null;
  const sort = useSortParam(OWN_OFFER_SORTS);
  const paging = usePageParam();
  const offers = useOwnOffers(organizationId, status, sort.value, paging);
  const canCreate = useCanInOrganization(PartnerOfferPermission.OFFER_CREATE);
  const verified = useIsVerified();

  if (!isPartner) return <NotAPartner />;

  const columns: DataTableColumns<RowOf<typeof offers>> = [
    {
      id: "offer",
      header: "Offer",
      sortKey: "title",
      cell: (offer) => (
        <>
          <Link href={`/partner/offers/${offer.id}`} className="font-medium hover:underline">
            {offer.title}
          </Link>
          <p className="text-muted-foreground text-xs">{offer.category.name}</p>
        </>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (offer) => <StatusBadge domain="offer" status={offer.display_status} />,
    },
    {
      id: "employees",
      header: "Employees",
      className: "hidden md:table-cell",
      cell: (offer) => <VisibilityBadge offer={offer} />,
    },
    {
      id: "valid",
      header: "Valid",
      sortKey: "valid_from",
      cellClassName: "text-muted-foreground",
      cell: (offer) => `${formatDate(offer.valid_from)} – ${formatDate(offer.valid_until)}`,
    },
  ];
  return (
    <div className="space-y-4">
      <VerificationNotice />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select
          value={status ?? ALL}
          onValueChange={(value) => {
            set({ status: value === ALL ? null : value });
          }}
        >
          <SelectTrigger className="w-48" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {OFFER_STATUSES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canCreate && verified !== false ? (
          <Button asChild>
            <Link href="/partner/offers/new">
              <Plus aria-hidden />
              New offer
            </Link>
          </Button>
        ) : null}
      </div>

      <QueryDataTable
        aria-label="Offers"
        query={offers}
        columns={columns}
        sort={sort}
        paging={paging}
        rowKey={(offer) => offer.id}
        empty={
          <EmptyState
            icon={Tag}
            title={status ? "No offers with this status" : "No offers yet"}
            description={
              status ? "Try another status." : "Offers you create appear here with their status."
            }
          />
        }
      />
    </div>
  );
}

function BackToOwnOffers() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-3">
      <Link href="/partner/offers">
        <ArrowLeft aria-hidden />
        Offers
      </Link>
    </Button>
  );
}

/** Portal intents: save, plus submit when the member may submit and the status allows it. */
function usePortalIntents(saveLabel: string, submittable: boolean): IntentButton[] {
  const canSubmit = useCanInOrganization(PartnerOfferPermission.OFFER_SUBMIT);
  if (!canSubmit || !submittable) return [{ intent: "save", label: saveLabel, primary: true }];
  return [
    { intent: "save", label: saveLabel },
    { intent: "submit", label: "Save and submit for review", primary: true },
  ];
}

function PortalOfferForm({
  offer,
  intents,
  onSubmit,
  onCancel,
}: {
  offer?: Offer;
  intents: readonly IntentButton[];
  onSubmit: Parameters<typeof OfferForm>[0]["onSubmit"];
  onCancel?: () => void;
}): ReactNode {
  const organizationId = useSelectedOrganizationId();
  const categories = useOwnCategoryOptions(organizationId, offer?.category);
  if (categories.query.isPending) return <Skeleton className="h-96 w-full" />;
  if (categories.query.isError) {
    return (
      <ErrorState error={categories.query.error} onRetry={() => void categories.query.refetch()} />
    );
  }
  return (
    <OfferForm
      defaultValues={offer ? offerValues(offer) : EMPTY_OFFER}
      categories={categories.options}
      intents={intents}
      reasonHint="Optional note, recorded in the audit log."
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  );
}

/** Creating an offer for the selected partner organization. */
export function NewOwnOffer() {
  const router = useRouter();
  const organizationId = useSelectedOrganizationId();
  const isPartner = useIsPartner();
  const verified = useIsVerified();
  const create = useCreateOwnOffer(organizationId);
  const intents = usePortalIntents("Save draft", true);

  if (!isPartner) return <NotAPartner />;
  return (
    <div className="space-y-6">
      <BackToOwnOffers />
      {verified === false ? (
        <VerificationNotice />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>New offer</CardTitle>
            <CardDescription>
              Save it as a draft or submit it for Aayulogic review. Employees see it only once
              approved and inside its dates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PortalOfferForm
              intents={intents}
              onSubmit={async (values, intent) => {
                const offer = await create.mutateAsync({
                  ...offerBody(values),
                  intent: intent === "submit" ? "submit" : "save",
                });
                toast.success(intent === "submit" ? "Offer submitted for review" : "Draft saved");
                router.push(`/partner/offers/${offer.id}`);
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** One of the selected organization's offers: status, feedback, edits and history. */
export function OwnOffer({ offerId }: { offerId: string }) {
  const organizationId = useSelectedOrganizationId();
  const offer = useOwnOffer(organizationId, offerId);

  if (offer.isPending) {
    return (
      <div className="space-y-6">
        <BackToOwnOffers />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (offer.isError) {
    return (
      <div className="space-y-6">
        <BackToOwnOffers />
        {offer.error instanceof ApiError && offer.error.isNotFound ? (
          <EmptyState title="Offer not found" />
        ) : (
          <ErrorState error={offer.error} onRetry={() => void offer.refetch()} />
        )}
      </div>
    );
  }
  return <OwnOfferWorkspace offer={offer.data} organizationId={organizationId} />;
}

type OwnerAction = "submit" | "withdraw";

function OwnOfferWorkspace({ offer, organizationId }: { offer: Offer; organizationId: string }) {
  const canUpdate = useCanInOrganization(PartnerOfferPermission.OFFER_UPDATE);
  const canSubmit = useCanInOrganization(PartnerOfferPermission.OFFER_SUBMIT);
  const canWithdraw = useCanInOrganization(PartnerOfferPermission.OFFER_WITHDRAW);
  const canViewDecisions = useCanInOrganization(PartnerOfferPermission.OFFER_DECISION_VIEW);
  const [editing, setEditing] = useState(false);
  const [acting, setActing] = useState<OwnerAction | null>(null);
  const update = useUpdateOwnOffer(organizationId, offer.id);
  const submit = useSubmitOwnOffer(organizationId, offer.id);
  const withdraw = useWithdrawOwnOffer(organizationId, offer.id);
  const approved = offer.status === "approved";
  const intents = usePortalIntents(
    approved ? "Save and send for review" : "Save changes",
    !approved,
  );

  const submitButton =
    canSubmit && isSubmittable(offer) ? (
      <Button onClick={() => setActing("submit")}>
        <Send aria-hidden />
        Submit for review
      </Button>
    ) : null;

  return (
    <div className="space-y-6">
      <BackToOwnOffers />
      <PageHeader
        title={offer.title}
        description={offer.benefit}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge domain="offer" status={offer.display_status} />
            {canWithdraw && isWithdrawable(offer) ? (
              <Button variant="outline" onClick={() => setActing("withdraw")}>
                <Undo2 aria-hidden />
                Withdraw to draft
              </Button>
            ) : null}
            {submitButton}
          </div>
        }
      />
      <OfferStatusCallout offer={offer} audience="partner" />
      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit offer</CardTitle>
            <CardDescription>
              Saving replaces every field.{" "}
              {approved
                ? "Changed content goes back to Aayulogic review and is hidden from employees until approved again."
                : "Submit it when it is ready for review."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PortalOfferForm
              offer={offer}
              intents={intents}
              onCancel={() => setEditing(false)}
              onSubmit={async (values, intent) => {
                await update.mutateAsync({
                  ...offerBody(values),
                  intent: intent === "submit" ? "submit" : "save",
                  expected_version: offer.version,
                });
                toast.success(intent === "submit" ? "Saved and submitted" : "Offer saved");
                setEditing(false);
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <OfferContentCard
          offer={offer}
          action={
            canUpdate && isEditable(offer) ? (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil aria-hidden />
                Edit
              </Button>
            ) : null
          }
        />
      )}
      <RedemptionCard offer={offer} />
      <PublicationCard offer={offer} />
      {canViewDecisions ? (
        <OwnDecisions organizationId={organizationId} offerId={offer.id} />
      ) : null}

      <ConfirmDialog
        open={acting === "submit"}
        onOpenChange={(open) => !open && setActing(null)}
        title="Submit for review?"
        description="Aayulogic reviews the current content. You cannot edit it while it waits, but you can withdraw it."
        confirmLabel="Submit"
        onConfirm={async () => {
          await submit.mutateAsync({ expected_version: offer.version, reason: "" });
          toast.success("Offer submitted for review");
        }}
      />
      <ConfirmDialog
        open={acting === "withdraw"}
        onOpenChange={(open) => !open && setActing(null)}
        title="Withdraw to draft?"
        description={
          approved
            ? "The offer stops being visible to employees. Submit it again to republish it."
            : "The review stops and the offer returns to draft."
        }
        confirmLabel="Withdraw"
        destructive
        onConfirm={async () => {
          await withdraw.mutateAsync({ expected_version: offer.version, reason: "" });
          toast.success("Offer withdrawn to draft");
        }}
      />
    </div>
  );
}

function OwnDecisions({ organizationId, offerId }: { organizationId: string; offerId: string }) {
  const paging = usePageParam("decisions_");
  return (
    <OfferDecisionHistory
      decisions={useOwnOfferDecisions(organizationId, offerId, paging)}
      paging={paging}
    />
  );
}
