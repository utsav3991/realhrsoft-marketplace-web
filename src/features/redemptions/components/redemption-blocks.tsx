"use client";

import {
  ArrowLeft,
  OctagonPause,
  ReceiptText,
  ShieldAlert,
  ShieldCheck,
  TicketCheck,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
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
import { ApiError } from "@/shared/api";
import {
  IdentityPermission,
  OfferAdminPermission,
  PartnerAdminPermission,
  RedemptionAdminPermission,
  useCan,
} from "@/shared/authorization";
import { Detail, DetailList } from "@/shared/components/details";
import { QueryDataTable, type RowOf } from "@/shared/components/query-data-table";
import { ReasonDialog } from "@/shared/components/reason-dialog";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";
import { useIdempotencyKey } from "@/shared/hooks/use-idempotency-key";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { useUrlParams } from "@/shared/hooks/use-url-params";
import { formatDateTime } from "@/shared/lib/format";

import { useActivateBlock, useClearBlock } from "../api/mutations";
import {
  useRedemptionBlock,
  useRedemptionBlocks,
  type BlockScope,
  type RedemptionBlock,
} from "../api/queries";

const ALL = "all";
const SCOPE_LABEL: Record<BlockScope, string> = { offer: "Offer", partner: "Partner" };
const SCOPES = Object.keys(SCOPE_LABEL) as BlockScope[];

const blockStatus = (block: RedemptionBlock) => (block.active ? "active" : "cleared");
const targetOf = (block: RedemptionBlock) => block.offer_id ?? block.partner_id ?? "";

/** Where the blocked offer or partner is administered, or null without permission. */
function useTargetHref(block: Pick<RedemptionBlock, "scope"> & { targetId: string }) {
  const canViewOffers = useCan(OfferAdminPermission.OFFER_VIEW);
  const canViewPartners = useCan(PartnerAdminPermission.PARTNER_VIEW);
  if (block.scope === "offer") return canViewOffers ? `/admin/offers/${block.targetId}` : null;
  return canViewPartners ? `/admin/partners/${block.targetId}` : null;
}

function TargetLink({ block }: { block: RedemptionBlock }) {
  const targetId = targetOf(block);
  const href = useTargetHref({ scope: block.scope, targetId });
  const label = (
    <>
      {SCOPE_LABEL[block.scope]} <span className="font-mono text-xs">{targetId.slice(0, 8)}…</span>
    </>
  );
  return href ? (
    <Link href={href} className="hover:underline">
      {label}
    </Link>
  ) : (
    label
  );
}

/** Emergency blocks, active ones first by default; filters live in the URL. */
export function RedemptionBlocks() {
  const { searchParams, set } = useUrlParams();
  const activeParam = searchParams.get("active");
  const filters = {
    // Active blocks are what an administrator acts on, so they are the default view.
    active: activeParam === ALL ? null : activeParam !== "false",
    scope: SCOPES.find((scope) => scope === searchParams.get("scope")) ?? null,
  };
  const paging = usePageParam();
  const blocks = useRedemptionBlocks(filters, paging);

  const columns: DataTableColumns<RowOf<typeof blocks>> = [
    {
      id: "target",
      header: "Blocks",
      cell: (block) => <TargetLink block={block} />,
    },
    {
      id: "reason",
      header: "Reason",
      cell: (block) => (
        <Link
          href={`/admin/redemption-blocks/${block.id}`}
          className="line-clamp-2 hover:underline"
        >
          {block.reason}
        </Link>
      ),
    },
    {
      id: "activated",
      header: "Activated",
      className: "hidden md:table-cell",
      cellClassName: "text-muted-foreground",
      cell: (block) => formatDateTime(block.activated_at),
    },
    {
      id: "status",
      header: "Status",
      cell: (block) => <StatusBadge domain="redemptionBlock" status={blockStatus(block)} />,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.active === null ? ALL : String(filters.active)}
          onValueChange={(value) => set({ active: value === "true" ? null : value })}
        >
          <SelectTrigger className="w-44" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Cleared</SelectItem>
            <SelectItem value={ALL}>Active and cleared</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.scope ?? ALL}
          onValueChange={(value) => set({ scope: value === ALL ? null : value })}
        >
          <SelectTrigger className="w-44" aria-label="Filter by scope">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Offers and partners</SelectItem>
            {SCOPES.map((scope) => (
              <SelectItem key={scope} value={scope}>
                {SCOPE_LABEL[scope]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <QueryDataTable
        aria-label="Redemption blocks"
        query={blocks}
        columns={columns}
        paging={paging}
        rowKey={(block) => block.id}
        empty={
          <EmptyState
            icon={ShieldCheck}
            title={filters.active ? "No active blocks" : "No blocks found"}
            description={
              filters.active
                ? "Every voucher can be used. Block an offer or a partner from its page."
                : undefined
            }
          />
        }
      />
    </div>
  );
}

function BackToBlocks() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-3">
      <Link href="/admin/redemption-blocks">
        <ArrowLeft aria-hidden />
        Redemption blocks
      </Link>
    </Button>
  );
}

export function RedemptionBlockRecord({ blockId }: { blockId: string }) {
  const block = useRedemptionBlock(blockId);

  if (block.isPending) {
    return (
      <div className="space-y-6">
        <BackToBlocks />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (block.isError) {
    return (
      <div className="space-y-6">
        <BackToBlocks />
        {block.error instanceof ApiError && block.error.isNotFound ? (
          <EmptyState icon={OctagonPause} title="Block not found" />
        ) : (
          <ErrorState error={block.error} onRetry={() => void block.refetch()} />
        )}
      </div>
    );
  }
  return <LoadedBlock block={block.data} />;
}

function AdminLink({ id }: { id: string }) {
  const canViewUsers = useCan(IdentityPermission.USER_VIEW);
  const text = <span className="font-mono text-xs">{id}</span>;
  return canViewUsers ? (
    <Link href={`/admin/users/${id}`} className="hover:underline">
      {text}
    </Link>
  ) : (
    text
  );
}

function LoadedBlock({ block }: { block: RedemptionBlock }) {
  const canClear = useCan(RedemptionAdminPermission.BLOCK_CLEAR);
  const [clearing, setClearing] = useState(false);
  return (
    <div className="space-y-6">
      <BackToBlocks />
      <PageHeader
        title={`${SCOPE_LABEL[block.scope]} redemption block`}
        description="While active, the vouchers in its scope cannot show a QR code, be validated or be confirmed, by anyone."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge domain="redemptionBlock" status={blockStatus(block)} />
            {block.active && canClear ? (
              <Button variant="outline" onClick={() => setClearing(true)}>
                <ShieldCheck aria-hidden />
                Clear block
              </Button>
            ) : null}
          </div>
        }
      />
      <Card>
        <CardContent>
          <DetailList>
            <Detail label="Blocks">
              <TargetLink block={block} />
            </Detail>
            <Detail label="Activated">{formatDateTime(block.activated_at)}</Detail>
            <Detail label="Activated by">
              <AdminLink id={block.activated_by} />
            </Detail>
            <Detail label="Reason" className="sm:col-span-2 lg:col-span-3">
              <span className="whitespace-pre-line">{block.reason}</span>
            </Detail>
            {block.cleared_at ? (
              <Detail label="Cleared">{formatDateTime(block.cleared_at)}</Detail>
            ) : null}
            {block.cleared_by ? (
              <Detail label="Cleared by">
                <AdminLink id={block.cleared_by} />
              </Detail>
            ) : null}
            {block.clear_reason ? (
              <Detail label="Why it was cleared" className="sm:col-span-2 lg:col-span-3">
                <span className="whitespace-pre-line">{block.clear_reason}</span>
              </Detail>
            ) : null}
          </DetailList>
        </CardContent>
      </Card>
      <ClearBlockDialog block={block} open={clearing} onOpenChange={setClearing} />
    </div>
  );
}

function ClearBlockDialog({
  block,
  open,
  onOpenChange,
}: {
  block: RedemptionBlock;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const attempt = useIdempotencyKey();
  const clear = useClearBlock(block.id);
  return (
    <ReasonDialog
      open={open}
      onOpenChange={(next) => {
        if (next) attempt.reset();
        onOpenChange(next);
      }}
      title="Clear this block?"
      description="Unused vouchers in its scope that have not expired become usable again. Revoked vouchers stay revoked."
      confirmLabel="Clear block"
      onConfirm={async (reason) => {
        await attempt.run((idempotencyKey) => clear.mutateAsync({ reason, idempotencyKey }));
        toast.success("Block cleared");
      }}
    />
  );
}

// Active blocks are rare (one per offer or partner at most), so one page holds them all.
const ACTIVE_BLOCKS = { offset: 0, limit: 100 };

/**
 * An offer's or a partner's vouchers on its admin page: links to them and their receipts, and
 * the emergency block over them. Unlike suspending an offer, a block stops vouchers already
 * issued from being used, until it is cleared.
 */
export function RedemptionControl({ scope, targetId }: { scope: BlockScope; targetId: string }) {
  const canViewBlocks = useCan(RedemptionAdminPermission.BLOCK_VIEW);
  const canActivate = useCan(RedemptionAdminPermission.BLOCK_ACTIVATE);
  const canViewVouchers = useCan(RedemptionAdminPermission.VOUCHER_VIEW);
  const canViewReceipts = useCan(RedemptionAdminPermission.REDEMPTION_VIEW);
  const blocks = useRedemptionBlocks({ active: true, scope }, ACTIVE_BLOCKS, {
    enabled: canViewBlocks,
  });
  const active = blocks.data?.results.find((block) => targetOf(block) === targetId);
  const [dialog, setDialog] = useState<"activate" | "clear" | null>(null);
  const attempt = useIdempotencyKey();
  const activate = useActivateBlock();
  const filter = scope === "offer" ? `offer_id=${targetId}` : `partner_id=${targetId}`;
  const what = scope === "offer" ? "this offer's" : "this partner's";

  if (!canViewBlocks && !canActivate && !canViewVouchers && !canViewReceipts) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vouchers</CardTitle>
        <CardDescription>
          {active
            ? `Use of ${what} vouchers is blocked.`
            : canViewBlocks
              ? `${what.charAt(0).toUpperCase()}${what.slice(1)} vouchers can be used.`
              : `Issued vouchers and their confirmed uses.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {active ? (
          <Alert variant="destructive">
            <ShieldAlert aria-hidden />
            <AlertTitle>Emergency block since {formatDateTime(active.activated_at)}</AlertTitle>
            <AlertDescription className="whitespace-pre-line">{active.reason}</AlertDescription>
          </Alert>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {canViewVouchers ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/vouchers?${filter}`}>
                <TicketCheck aria-hidden />
                Vouchers
              </Link>
            </Button>
          ) : null}
          {canViewReceipts ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/redemptions?${filter}`}>
                <ReceiptText aria-hidden />
                Receipts
              </Link>
            </Button>
          ) : null}
          {active ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/redemption-blocks/${active.id}`}>
                <OctagonPause aria-hidden />
                Open block
              </Link>
            </Button>
          ) : canActivate && !blocks.isPending ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                attempt.reset();
                setDialog("activate");
              }}
            >
              <OctagonPause aria-hidden />
              Block redemptions
            </Button>
          ) : null}
          {active ? <ClearAction block={active} /> : null}
        </div>
      </CardContent>
      <ReasonDialog
        open={dialog === "activate"}
        onOpenChange={(next) => !next && setDialog(null)}
        title="Block redemptions?"
        description={`Immediately stops every one of ${what} vouchers from showing a QR code, being validated or being confirmed, administrators included. Vouchers are not revoked: clearing the block makes the unused ones usable again until they expire.`}
        confirmLabel="Block redemptions"
        destructive
        onConfirm={async (reason) => {
          await attempt.run((idempotencyKey) =>
            activate.mutateAsync({ scope, targetId, reason, idempotencyKey }),
          );
          toast.success("Redemptions blocked");
        }}
      />
    </Card>
  );
}

function ClearAction({ block }: { block: RedemptionBlock }) {
  const canClear = useCan(RedemptionAdminPermission.BLOCK_CLEAR);
  const [open, setOpen] = useState(false);
  if (!canClear) return null;
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ShieldCheck aria-hidden />
        Clear block
      </Button>
      <ClearBlockDialog block={block} open={open} onOpenChange={setOpen} />
    </>
  );
}
