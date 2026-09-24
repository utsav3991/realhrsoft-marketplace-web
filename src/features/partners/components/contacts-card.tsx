"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/design-system/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/design-system/primitives/card";
import { Checkbox } from "@/design-system/primitives/checkbox";
import { Label } from "@/design-system/primitives/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/primitives/table";
import { errorMessage } from "@/shared/api";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { applyApiFieldErrors } from "@/shared/forms/api-field-errors";

import {
  useAddContact,
  useRemoveContact,
  useUpdateContact,
  type PartnerTarget,
} from "../api/mutations";
import type { PartnerProfile } from "../api/queries";
import { CONTACT_FIELDS, contactBody, contactSchema, type ContactValues } from "../schemas/partner";
import { FormDialog } from "./form-dialog";
import { TextFields, type TextFieldSpec } from "./text-fields";

type Contact = PartnerProfile["contacts"][number];

const NONE = "—";
const FIELDS: readonly TextFieldSpec<ContactValues>[] = [
  { name: "name", label: "Name" },
  { name: "title", label: "Title (optional)" },
  { name: "email", label: "Email", type: "email", hint: "An email or a phone number is required." },
  { name: "phone", label: "Phone", type: "tel" },
];

/** Contacts, editable when an editor (target, loaded version) is given. */
export function ContactsCard({
  contacts,
  editor,
}: {
  contacts: readonly Contact[];
  editor?: { target: PartnerTarget; version: number };
}) {
  const [editing, setEditing] = useState<Contact | "new" | null>(null);
  const [removing, setRemoving] = useState<Contact | null>(null);
  const remove = useRemoveContact(editor?.target ?? { kind: "registration", partnerId: "" });

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>Contacts</CardTitle>
          <CardDescription>The primary contact is who Aayulogic reaches first.</CardDescription>
        </div>
        {editor ? (
          <Button variant="outline" size="sm" onClick={() => setEditing("new")}>
            <Plus aria-hidden />
            Add contact
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <p className="text-muted-foreground text-sm">No contacts yet.</p>
        ) : (
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  {editor ? <TableHead className="sr-only">Actions</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <span className="flex items-center gap-1.5 font-medium">
                        {contact.name}
                        {contact.is_primary ? (
                          <Star
                            className="text-primary size-3.5"
                            aria-label="Primary contact"
                            role="img"
                          />
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{contact.title ?? NONE}</TableCell>
                    <TableCell>{contact.email ?? NONE}</TableCell>
                    <TableCell>{contact.phone ?? NONE}</TableCell>
                    {editor ? (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit contact ${contact.name}`}
                          onClick={() => setEditing(contact)}
                        >
                          <Pencil aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove contact ${contact.name}`}
                          onClick={() => setRemoving(contact)}
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {editor && editing ? (
        <ContactDialog
          key={editing === "new" ? "new" : editing.id}
          editor={editor}
          contact={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {editor ? (
        <ConfirmDialog
          open={removing !== null}
          onOpenChange={(open) => !open && setRemoving(null)}
          title={`Remove ${removing?.name ?? "contact"}?`}
          description="If this is the primary contact, the next contact becomes primary."
          confirmLabel="Remove"
          destructive
          onConfirm={async () => {
            if (!removing) return;
            await remove.mutateAsync({ contactId: removing.id, version: editor.version });
            toast.success("Contact removed");
          }}
        />
      ) : null}
    </Card>
  );
}

function ContactDialog({
  editor,
  contact,
  onClose,
}: {
  editor: { target: PartnerTarget; version: number };
  contact: Contact | null;
  onClose: () => void;
}) {
  const add = useAddContact(editor.target);
  const update = useUpdateContact(editor.target);
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: contact?.name ?? "",
      title: contact?.title ?? "",
      email: contact?.email ?? "",
      phone: contact?.phone ?? "",
      primary: false,
    },
  });
  const { isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      if (contact) {
        await update.mutateAsync({
          contactId: contact.id,
          body: { ...contactBody(values), version: editor.version },
        });
        toast.success("Contact updated");
      } else {
        await add.mutateAsync({
          ...contactBody(values),
          primary: values.primary,
          version: editor.version,
        });
        toast.success("Contact added");
      }
      onClose();
    } catch (error) {
      if (!applyApiFieldErrors(error, form, CONTACT_FIELDS)) setFailure(errorMessage(error));
    }
  });

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={contact ? "Edit contact" : "Add contact"}
      submitLabel={contact ? "Save contact" : "Add contact"}
      submitting={isSubmitting}
      failure={failure}
      onSubmit={() => void submit()}
    >
      <TextFields form={form} fields={FIELDS} idPrefix="contact" disabled={isSubmitting} />
      {contact ? null : (
        <div className="flex items-center gap-2">
          <Controller
            control={form.control}
            name="primary"
            render={({ field }) => (
              <Checkbox
                id="contact-primary"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                disabled={isSubmitting}
              />
            )}
          />
          <Label htmlFor="contact-primary">Make this the primary contact</Label>
        </div>
      )}
    </FormDialog>
  );
}
