"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, ImagePlus, Images, Loader2 } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { useForm, useFormContext, useWatch } from "react-hook-form";

import { Button } from "@/design-system/primitives/button";
import { Checkbox } from "@/design-system/primitives/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/design-system/primitives/dialog";
import {
  Form,
  FormActions,
  FormAlert,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormSection,
} from "@/design-system/primitives/form";
import { Input } from "@/design-system/primitives/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/primitives/select";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { Textarea } from "@/design-system/primitives/textarea";
import { useOffers, useOwnOffers, type Offer } from "@/features/offers/api/queries";
import { shownVersion } from "@/features/offers/components/offer-details";
import { errorMessage, FIRST_PAGE, isUuid, type Schemas } from "@/shared/api";
import {
  MarketingAdminPermission,
  OfferAdminPermission,
  PartnerOfferPermission,
  useCan,
  useCanInOrganization,
} from "@/shared/authorization";
import { applyApiFieldErrors } from "@/shared/forms/api-field-errors";
import { cn } from "@/shared/lib/cn";

import { useUploadAsset } from "../api/mutations";
import {
  useAsset,
  useAssets,
  useTargetableSlots,
  type CreativeAsset,
  type PlacementSlot,
  type Workspace,
} from "../api/queries";
import {
  AD_FIELDS,
  adSchema,
  CREATIVE_LABEL,
  CREATIVE_TYPES,
  DEFAULT_ACTION_LABEL,
  DESTINATION_LABEL,
  imageFileProblem,
  linkTarget,
  MAX_SLOTS,
  PAGE_ACTION_LABEL,
  PAGE_BODY_MAX,
  PAGE_TITLE_MAX,
  slotMisfit,
  type AdValues,
} from "../schemas/advertisement";
import { SURFACE_LABEL } from "../schemas/catalogue";
import { AssetImage } from "./ad-details";
import { useWorkspaceCan } from "./workspace";

const LIBRARY_PAGE = 12;

export type AdIntent = Schemas["AdIntentEnum"];

export interface AdIntentButton {
  intent: AdIntent;
  label: string;
  /** The one lime button of the form; the others are outline. */
  primary?: boolean;
}

interface AdFormProps {
  workspace: Workspace;
  /** The owner's partner: administrators upload assets and pick offers for it. */
  partnerId: string | null;
  defaultValues: AdValues;
  intents: readonly AdIntentButton[];
  reasonHint: string;
  /** Resolves on success or throws an ApiError, shown in the form. */
  onSubmit: (values: AdValues, intent: AdIntent) => Promise<unknown>;
  onCancel?: () => void;
  /** Read-only context rendered first (the campaign). */
  children?: ReactNode;
}

/**
 * An advertisement's content: creative, destination and placements. Saving replaces the
 * working draft (or starts one); the approved revision keeps serving until a new one is
 * approved.
 */
export function AdForm({
  workspace,
  partnerId,
  defaultValues,
  intents,
  reasonHint,
  onSubmit,
  onCancel,
  children,
}: AdFormProps) {
  const [failure, setFailure] = useState<string | null>(null);
  const [pendingIntent, setPendingIntent] = useState<AdIntent | null>(null);
  const form = useForm<AdValues>({ resolver: zodResolver(adSchema), defaultValues });
  const { isSubmitting } = form.formState;
  const creativeType = useWatch({ control: form.control, name: "creativeType" });
  const destinationType = useWatch({ control: form.control, name: "destinationType" });
  const pageAction = useWatch({ control: form.control, name: "pageAction" });
  const target = linkTarget({ destinationType, pageAction });

  function submitWith(intent: AdIntent) {
    return form.handleSubmit(async (values) => {
      setFailure(null);
      setPendingIntent(intent);
      try {
        await onSubmit(values, intent);
      } catch (error) {
        if (!applyApiFieldErrors(error, form, AD_FIELDS)) setFailure(errorMessage(error));
      } finally {
        setPendingIntent(null);
      }
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const primary = intents.find((i) => i.primary) ?? intents[0];
          if (primary) void submitWith(primary.intent)(event);
        }}
        noValidate
        className="space-y-8"
      >
        {failure ? <FormAlert>{failure}</FormAlert> : null}
        {children}

        <FormSection title="Advertisement" columns={1} disabled={isSubmitting}>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Internal name</FormLabel>
                <FormControl>
                  <Input className="sm:max-w-md" {...field} />
                </FormControl>
                <FormDescription>
                  For your workspace only; never shown to employees.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        <FormSection
          title="Creative"
          description="What employees see. Aayulogic reviews it before it can serve."
          disabled={isSubmitting}
        >
          <FormField
            control={form.control}
            name="creativeType"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Format</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
                  <FormControl>
                    <SelectTrigger ref={field.ref} onBlur={field.onBlur} className="w-full sm:w-72">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CREATIVE_TYPES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  {CREATIVE_TYPES.find((option) => option.value === field.value)?.hint}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          {creativeType === "image_banner" ? (
            <>
              <ImageField workspace={workspace} partnerId={partnerId} disabled={isSubmitting} />
              <FormField
                control={form.control}
                name="altText"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Alt text</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>Describes the image for screen readers.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          ) : null}
          <FormField
            control={form.control}
            name="headline"
            render={({ field }) => (
              <FormItem>
                <FormLabel optional={creativeType === "image_banner"}>Headline</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ctaLabel"
            render={({ field }) => (
              <FormItem>
                <FormLabel optional>Button label</FormLabel>
                <FormControl>
                  <Input placeholder="Learn more" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {creativeType === "text_card" ? (
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel optional>Supporting text</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
        </FormSection>

        <FormSection
          title="Destination"
          description="Where a click leads. Only https links are accepted; an offer must be one of the owner's marketplace offers. An advertisement page is its own page in the marketplace, with an optional button."
          disabled={isSubmitting}
        >
          <FormField
            control={form.control}
            name="destinationType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Leads to</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
                  <FormControl>
                    <SelectTrigger ref={field.ref} onBlur={field.onBlur} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="external_url">{DESTINATION_LABEL.external_url}</SelectItem>
                    <SelectItem value="offer">
                      {workspace.kind === "admin"
                        ? "One of the partner's offers"
                        : DESTINATION_LABEL.offer}
                    </SelectItem>
                    <SelectItem value="ad_page">{DESTINATION_LABEL.ad_page}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {destinationType === "ad_page" ? (
            <AdPageFields workspace={workspace} disabled={isSubmitting} />
          ) : null}
          {target === "external_url" ? (
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : target === "offer" ? (
            <OfferField workspace={workspace} partnerId={partnerId} disabled={isSubmitting} />
          ) : null}
          {destinationType === "ad_page" && target ? (
            <FormField
              control={form.control}
              name="actionLabel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel optional>Page button label</FormLabel>
                  <FormControl>
                    <Input placeholder={DEFAULT_ACTION_LABEL[target]} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
        </FormSection>

        <FormSection
          title="Placements"
          description={`Where it may appear, up to ${MAX_SLOTS}. Image banners must match each placement's shape and size.`}
          columns={1}
          disabled={isSubmitting}
        >
          <SlotField workspace={workspace} />
        </FormSection>

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel optional>Note</FormLabel>
              <FormControl>
                <Textarea rows={2} disabled={isSubmitting} {...field} />
              </FormControl>
              <FormDescription>{reasonHint}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormActions>
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          ) : null}
          {intents.map((button) => (
            <Button
              key={button.intent}
              type="button"
              variant={button.primary ? "default" : "outline"}
              disabled={isSubmitting}
              onClick={(event) => void submitWith(button.intent)(event)}
            >
              {pendingIntent === button.intent ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : null}
              {button.label}
            </Button>
          ))}
        </FormActions>
      </form>
    </Form>
  );
}

// --- Image -------------------------------------------------------------------------------

function ImageField({
  workspace,
  partnerId,
  disabled,
}: {
  workspace: Workspace;
  partnerId: string | null;
  disabled: boolean;
}) {
  const form = useFormContext<AdValues>();
  const assetId = form.watch("assetId");
  const asset = useAsset(workspace, assetId && isUuid(assetId) ? assetId : null);
  const upload = useUploadAsset(workspace);
  const canUpload = useWorkspaceCan(workspace, "adManage");
  const input = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [browsing, setBrowsing] = useState(false);

  function choose(id: string) {
    form.setValue("assetId", id, { shouldDirty: true, shouldValidate: true });
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    const local = imageFileProblem(file);
    setProblem(local);
    if (local) return;
    try {
      const uploaded = await upload.mutateAsync({ file, partnerId: partnerId ?? undefined });
      choose(uploaded.id);
    } catch (error) {
      setProblem(errorMessage(error));
    }
  }

  return (
    <FormField
      control={form.control}
      name="assetId"
      render={() => (
        <FormItem className="sm:col-span-2">
          <FormLabel>Image</FormLabel>
          <div className="flex flex-wrap items-start gap-4">
            {assetId ? (
              <AssetImage
                workspace={workspace}
                assetId={assetId}
                alt="Selected image"
                className="h-24 w-72 object-contain"
              />
            ) : null}
            <div className="space-y-2">
              {asset.data ? (
                <p className="text-muted-foreground text-sm">
                  {asset.data.original_name} · {asset.data.width}×{asset.data.height} px
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {canUpload ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled || upload.isPending}
                    onClick={() => input.current?.click()}
                  >
                    {upload.isPending ? (
                      <Loader2 className="animate-spin" aria-hidden />
                    ) : (
                      <ImagePlus aria-hidden />
                    )}
                    Upload image
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  onClick={() => setBrowsing(true)}
                >
                  <Images aria-hidden />
                  Choose uploaded
                </Button>
              </div>
            </div>
          </div>
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            tabIndex={-1}
            aria-label="Image file"
            onChange={(event) => {
              void onFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <FormDescription>
            PNG, JPEG or WebP, at most 2 MB and 4096 px per side. Stored privately.
          </FormDescription>
          {problem ? <p className="text-destructive text-sm">{problem}</p> : <FormMessage />}
          {browsing ? (
            <AssetLibrary
              workspace={workspace}
              partnerId={partnerId}
              selected={assetId}
              onChoose={(id) => {
                choose(id);
                setBrowsing(false);
              }}
              onClose={() => setBrowsing(false)}
            />
          ) : null}
        </FormItem>
      )}
    />
  );
}

/** The owner's uploaded images, newest first, to reuse one. */
function AssetLibrary({
  workspace,
  partnerId,
  selected,
  onChoose,
  onClose,
}: {
  workspace: Workspace;
  partnerId: string | null;
  selected: string;
  onChoose: (assetId: string) => void;
  onClose: () => void;
}) {
  // Local paging: the dialog must not rewrite the page's URL.
  const [offset, setOffset] = useState(0);
  const assets = useAssets(workspace, partnerId, "", { offset, limit: LIBRARY_PAGE });
  const page = assets.data;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Choose an uploaded image</DialogTitle>
          <DialogDescription>
            Uploaded images never change; reuse one across revisions.
          </DialogDescription>
        </DialogHeader>
        {assets.isPending ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : assets.isError ? (
          <p className="text-destructive text-sm">{errorMessage(assets.error)}</p>
        ) : page && page.results.length > 0 ? (
          <>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {page.results.map((asset) => (
                <li key={asset.id}>
                  <AssetTile
                    workspace={workspace}
                    asset={asset}
                    selected={asset.id === selected}
                    onChoose={() => onChoose(asset.id)}
                  />
                </li>
              ))}
            </ul>
            {page.count > LIBRARY_PAGE ? (
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={offset === 0}
                  onClick={() => setOffset(offset - LIBRARY_PAGE)}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={offset + LIBRARY_PAGE >= page.count}
                  onClick={() => setOffset(offset + LIBRARY_PAGE)}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-muted-foreground text-sm">No images uploaded yet.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AssetTile({
  workspace,
  asset,
  selected,
  onChoose,
}: {
  workspace: Workspace;
  asset: CreativeAsset;
  selected: boolean;
  onChoose: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChoose}
      aria-pressed={selected}
      className={cn(
        "bg-card w-full space-y-2 rounded-xl border p-2 text-left",
        "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
        selected && "border-primary ring-primary ring-1",
      )}
    >
      <AssetImage
        workspace={workspace}
        assetId={asset.id}
        alt={asset.original_name}
        className="h-24 w-full object-contain"
      />
      <span className="block truncate text-xs">{asset.original_name}</span>
      <span className="text-muted-foreground block text-xs">
        {asset.width}×{asset.height} px
      </span>
    </button>
  );
}

// --- Advertisement page ------------------------------------------------------------------

function AdPageFields({ workspace, disabled }: { workspace: Workspace; disabled: boolean }) {
  const form = useFormContext<AdValues>();
  return (
    <>
      <FormField
        control={form.control}
        name="pageTitle"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Page title</FormLabel>
            <FormControl>
              <Input maxLength={PAGE_TITLE_MAX} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="pageBody"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Page text</FormLabel>
            <FormControl>
              <Textarea rows={8} maxLength={PAGE_BODY_MAX} {...field} />
            </FormControl>
            <FormDescription>
              Plain text, up to {PAGE_BODY_MAX.toLocaleString()} characters. Line breaks are kept.
              The creative&apos;s image, if any, heads the page.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="pageAction"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Page button</FormLabel>
            <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
              <FormControl>
                <SelectTrigger ref={field.ref} onBlur={field.onBlur} className="w-full">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="none">{PAGE_ACTION_LABEL.none}</SelectItem>
                <SelectItem value="offer">
                  {workspace.kind === "admin"
                    ? "One of the partner's offers"
                    : PAGE_ACTION_LABEL.offer}
                </SelectItem>
                <SelectItem value="external_url">{PAGE_ACTION_LABEL.external_url}</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>
              An offer button shows only to employees who can open that offer.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

// --- Offer destination -------------------------------------------------------------------

function OfferField({
  workspace,
  partnerId,
  disabled,
}: {
  workspace: Workspace;
  partnerId: string | null;
  disabled: boolean;
}) {
  const canBrowseAdmin = useCan(OfferAdminPermission.OFFER_VIEW);
  const canBrowseOwn = useCanInOrganization(PartnerOfferPermission.OFFER_VIEW);
  if (workspace.kind === "admin") {
    return canBrowseAdmin && partnerId ? (
      <AdminOfferSelect partnerId={partnerId} disabled={disabled} />
    ) : (
      <OfferIdInput disabled={disabled} />
    );
  }
  return canBrowseOwn ? (
    <OwnOfferSelect organizationId={workspace.organizationId} disabled={disabled} />
  ) : (
    <OfferIdInput disabled={disabled} />
  );
}

function AdminOfferSelect({ partnerId, disabled }: { partnerId: string; disabled: boolean }) {
  const offers = useOffers(
    {
      search: "",
      status: null,
      inReview: null,
      acceptanceMode: null,
      source: null,
      postedVia: null,
      featured: null,
      partnerId,
      organizationId: null,
      ordering: null,
    },
    FIRST_PAGE,
  );
  return <OfferSelect query={offers} disabled={disabled} />;
}

function OwnOfferSelect({
  organizationId,
  disabled,
}: {
  organizationId: string;
  disabled: boolean;
}) {
  const offers = useOwnOffers(organizationId, null, null, FIRST_PAGE);
  return <OfferSelect query={offers} disabled={disabled} />;
}

function OfferSelect({
  query,
  disabled,
}: {
  query: { data?: { results: Offer[] }; isPending: boolean; isError: boolean };
  disabled: boolean;
}) {
  const form = useFormContext<AdValues>();
  const offers = query.data?.results ?? [];
  return (
    <FormField
      control={form.control}
      name="offerId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Offer</FormLabel>
          <Select
            value={field.value}
            onValueChange={field.onChange}
            disabled={disabled || query.isPending}
          >
            <FormControl>
              <SelectTrigger ref={field.ref} onBlur={field.onBlur} className="w-full">
                <SelectValue
                  placeholder={query.isPending ? "Loading offers…" : "Choose an offer"}
                />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {field.value && !offers.some((offer) => offer.id === field.value) ? (
                <SelectItem value={field.value}>Current offer</SelectItem>
              ) : null}
              {offers.map((offer) => (
                <SelectItem key={offer.id} value={offer.id}>
                  {shownVersion(offer)?.title ?? "Untitled offer"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormDescription>
            {query.isError
              ? "Offers could not be loaded."
              : "Serving checks for each viewer that the offer is available to them."}
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function OfferIdInput({ disabled }: { disabled: boolean }) {
  const form = useFormContext<AdValues>();
  return (
    <FormField
      control={form.control}
      name="offerId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Offer ID</FormLabel>
          <FormControl>
            <Input
              className="font-mono"
              autoComplete="off"
              spellCheck={false}
              disabled={disabled}
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// --- Placements --------------------------------------------------------------------------

function SlotField({ workspace }: { workspace: Workspace }) {
  const canListAdmin = useCan(MarketingAdminPermission.SLOT_VIEW);
  const canList = workspace.kind === "partner" || canListAdmin;
  const slots = useTargetableSlots(workspace, { enabled: canList });
  const form = useFormContext<AdValues>();
  const creativeType = form.watch("creativeType");
  const assetId = form.watch("assetId");
  const asset = useAsset(
    workspace,
    creativeType === "image_banner" && assetId && isUuid(assetId) ? assetId : null,
  );

  if (!canList) {
    return (
      <p className="text-muted-foreground text-sm">
        Choosing placements needs permission to view the placement slot catalogue.
      </p>
    );
  }
  if (slots.isPending) return <Skeleton className="h-32 w-full" />;
  if (slots.isError) {
    return <p className="text-destructive text-sm">{errorMessage(slots.error)}</p>;
  }
  return (
    <FormField
      control={form.control}
      name="slotKeys"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="sr-only">Placements</FormLabel>
          {slots.data.length === 0 ? (
            <p className="text-muted-foreground text-sm">No placements are available.</p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {slots.data.map((slot) => (
                <li key={slot.id}>
                  <SlotOption
                    slot={slot}
                    checked={field.value.includes(slot.key)}
                    misfit={slotMisfit(slot, creativeType, asset.data ?? null)}
                    accepts={slot.allowed_creative_types.includes(creativeType)}
                    onChange={(checked) =>
                      field.onChange(
                        checked
                          ? [...field.value, slot.key]
                          : field.value.filter((key) => key !== slot.key),
                      )
                    }
                  />
                </li>
              ))}
            </ul>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function SlotOption({
  slot,
  checked,
  misfit,
  accepts,
  onChange,
}: {
  slot: PlacementSlot;
  checked: boolean;
  misfit: string | null;
  accepts: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = `slot-${slot.id}`;
  return (
    <div className={cn("flex gap-3 rounded-xl border p-3", checked && "border-primary")}>
      <Checkbox
        id={id}
        checked={checked}
        // A slot that does not accept the format can still be unchecked.
        disabled={!accepts && !checked}
        onCheckedChange={(value) => onChange(value === true)}
        className="mt-0.5"
      />
      <label htmlFor={id} className="min-w-0 flex-1 space-y-1">
        <span className="block text-sm font-medium">{slot.name}</span>
        <span className="text-muted-foreground block text-xs">
          {SURFACE_LABEL[slot.surface]} · {slot.width}×{slot.height} px ·{" "}
          {slot.allowed_creative_types
            .map((type) =>
              type === "image_banner" || type === "text_card" ? CREATIVE_LABEL[type] : type,
            )
            .join(", ")}
        </span>
        {misfit ? (
          <span className="text-destructive flex items-center gap-1 text-xs">
            <AlertTriangle className="size-3.5" aria-hidden />
            {misfit}
          </span>
        ) : null}
      </label>
    </div>
  );
}
