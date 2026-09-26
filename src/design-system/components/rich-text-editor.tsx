"use client";

import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { Bold, Italic, Link2, List, ListOrdered, Unlink } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";

import { fieldLabelId } from "@/design-system/primitives/form";
import { Button } from "@/design-system/primitives/button";
import { Input } from "@/design-system/primitives/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/design-system/primitives/popover";
import { cn } from "@/shared/lib/cn";

/*
 * Rich text is stored as Markdown: the API keeps plain text columns, length limits count the
 * same characters the server does, and plain-text surfaces (emails, previews) stay readable.
 * Rendering goes through the editor schema (never innerHTML), so only these marks and nodes
 * can appear, and the Link extension rejects script URLs.
 */
function extensions(placeholder?: string) {
  return [
    StarterKit.configure({
      heading: false,
      blockquote: false,
      code: false,
      codeBlock: false,
      horizontalRule: false,
      strike: false,
      underline: false,
      link: {
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        protocols: ["https", "http", "mailto"],
      },
    }),
    Markdown.configure({ markedOptions: { breaks: true } }),
    ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
  ];
}

const CONTENT = "rich-text";

interface RichTextEditorProps {
  /** The control's id; the field's label names it through `aria-labelledby`. */
  id?: string;
  /** Markdown, or "" when empty. */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

/** A Tiptap editor for long-form content: bold, italic, lists and links. */
export function RichTextEditor({
  id: idProp,
  value,
  onChange,
  onBlur,
  disabled = false,
  placeholder,
  className,
  "aria-invalid": invalid,
  "aria-describedby": describedBy,
}: RichTextEditorProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const editor = useEditor({
    extensions: extensions(placeholder),
    content: value,
    contentType: "markdown",
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getMarkdown()),
    onBlur: () => onBlur?.(),
  });

  // Accessibility attributes follow the field's error state.
  useEffect(() => {
    editor?.setOptions({
      editorProps: {
        attributes: {
          id,
          role: "textbox",
          "aria-multiline": "true",
          "aria-labelledby": fieldLabelId(id),
          ...(describedBy ? { "aria-describedby": describedBy } : {}),
          ...(invalid ? { "aria-invalid": "true" } : {}),
          ...(disabled ? { "aria-disabled": "true" } : {}),
          class: cn(CONTENT, "min-h-24 px-3 py-2.5 text-base outline-none"),
        },
      },
    });
  }, [editor, id, describedBy, invalid, disabled]);

  useEffect(() => {
    editor?.setEditable(!disabled, false);
  }, [editor, disabled]);

  // Follow resets from outside (form.reset, loaded defaults), never the user's own typing.
  useEffect(() => {
    if (!editor || editor.isFocused) return;
    const current = editor.isEmpty ? "" : editor.getMarkdown();
    if (current !== value) editor.commands.setContent(value, { contentType: "markdown" });
  }, [editor, value]);

  return (
    <div
      data-invalid={invalid || undefined}
      className={cn(
        "border-input bg-card shadow-ring w-full overflow-hidden rounded-lg border transition-[color,box-shadow]",
        "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
        "data-[invalid]:border-destructive data-[invalid]:ring-destructive/20",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      {editor ? (
        <Toolbar editor={editor} disabled={disabled} />
      ) : (
        <div className="h-11 border-b" aria-hidden />
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor, disabled }: { editor: Editor; disabled: boolean }) {
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      bulletList: editor.isActive("bulletList"),
      orderedList: editor.isActive("orderedList"),
      link: editor.isActive("link"),
    }),
  });
  const chain = () => editor.chain().focus();

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex flex-wrap items-center gap-1 border-b px-1.5 py-1"
    >
      <ToolButton
        label="Bold"
        active={state.bold}
        disabled={disabled}
        onClick={() => chain().toggleBold().run()}
      >
        <Bold aria-hidden />
      </ToolButton>
      <ToolButton
        label="Italic"
        active={state.italic}
        disabled={disabled}
        onClick={() => chain().toggleItalic().run()}
      >
        <Italic aria-hidden />
      </ToolButton>
      <ToolButton
        label="Bulleted list"
        active={state.bulletList}
        disabled={disabled}
        onClick={() => chain().toggleBulletList().run()}
      >
        <List aria-hidden />
      </ToolButton>
      <ToolButton
        label="Numbered list"
        active={state.orderedList}
        disabled={disabled}
        onClick={() => chain().toggleOrderedList().run()}
      >
        <ListOrdered aria-hidden />
      </ToolButton>
      {state.link ? (
        <ToolButton
          label="Remove link"
          disabled={disabled}
          onClick={() => chain().extendMarkRange("link").unsetLink().run()}
        >
          <Unlink aria-hidden />
        </ToolButton>
      ) : (
        <LinkButton editor={editor} disabled={disabled} />
      )}
    </div>
  );
}

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="data-[active]:bg-accent data-[active]:text-accent-foreground size-8"
      aria-label={label}
      aria-pressed={active === undefined ? undefined : active}
      data-active={active || undefined}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function LinkButton({ editor, disabled }: { editor: Editor; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [href, setHref] = useState("");
  const [invalid, setInvalid] = useState(false);

  function apply() {
    const url = href.trim();
    const withProtocol = /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
    if (!url || !/^(https?:\/\/|mailto:)/i.test(withProtocol)) {
      setInvalid(true);
      return;
    }
    const chain = editor.chain().focus().extendMarkRange("link");
    if (editor.state.selection.empty) {
      chain
        .insertContent({
          type: "text",
          text: url,
          marks: [{ type: "link", attrs: { href: withProtocol } }],
        })
        .run();
    } else {
      chain.setLink({ href: withProtocol }).run();
    }
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setHref("");
          setInvalid(false);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Add link"
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
        >
          <Link2 aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-2 p-3">
        <div className="flex gap-2">
          <Input
            type="url"
            inputMode="url"
            placeholder="https://example.com"
            aria-label="Link address"
            aria-invalid={invalid || undefined}
            className="h-9"
            value={href}
            onChange={(event) => {
              setHref(event.target.value);
              setInvalid(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                apply();
              }
            }}
          />
          <Button type="button" size="sm" onClick={apply}>
            Add
          </Button>
        </div>
        {invalid ? <p className="text-destructive text-sm">Enter a web or email link</p> : null}
      </PopoverContent>
    </Popover>
  );
}

/** Renders stored Markdown read-only through the same schema as the editor. */
export function RichText({ value, className }: { value: string; className?: string }) {
  const editor = useEditor({
    extensions: extensions(),
    content: value,
    contentType: "markdown",
    editable: false,
    immediatelyRender: false,
    editorProps: { attributes: { class: cn(CONTENT, className) } },
  });

  useEffect(() => {
    editor?.commands.setContent(value, { contentType: "markdown" });
  }, [editor, value]);

  // Until the editor mounts (and in tests), show the text as written.
  if (!editor) return <span className={cn("whitespace-pre-line", className)}>{value}</span>;
  return <EditorContent editor={editor} />;
}

/** Markdown → a single line of plain text, for previews, table cells and clamped cards. */
export function richTextPreview(value: string): string {
  return value
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/gm, "")
    .replace(/(\*\*|__|\*|_)(\S(?:.*?\S)?)\1/g, "$2")
    .replace(/\\([\\`*_{}[\]()#+\-.!])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
