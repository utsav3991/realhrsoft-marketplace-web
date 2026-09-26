import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Field } from "./field";
import { RichText, RichTextEditor, richTextPreview } from "./rich-text-editor";

function Harness({ initial = "", onChange }: { initial?: string; onChange: (v: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <Field id="notes" label="Notes">
      <RichTextEditor
        id="notes"
        value={value}
        onChange={(next) => {
          setValue(next);
          onChange(next);
        }}
      />
    </Field>
  );
}

describe("<RichTextEditor>", () => {
  it("is labelled by its field and emits Markdown", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    const editor = await screen.findByRole("textbox", { name: "Notes" });
    await user.click(editor);
    await user.click(screen.getByRole("button", { name: "Bold" }));
    await user.type(editor, "Hello");
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith("**Hello**"));
  });

  it("loads Markdown and reports an emptied editor as an empty string", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness initial="- one" onChange={onChange} />);

    const editor = await screen.findByRole("textbox", { name: "Notes" });
    expect(editor.querySelector("ul li")).toHaveTextContent("one");
    await user.click(editor);
    await user.keyboard("{Control>}a{/Control}{Backspace}{Backspace}");
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(""));
  });
});

describe("<RichText>", () => {
  it("renders Markdown without script links", async () => {
    const { container } = render(
      <RichText value={"**Bold** [site](https://example.test) [bad](javascript:alert(1))"} />,
    );
    await waitFor(() => expect(container.querySelector("strong")).toHaveTextContent("Bold"));
    expect(container.querySelector('a[href="https://example.test"]')).toHaveTextContent("site");
    expect(container.querySelector('a[href^="javascript"]')).toBeNull();
  });
});

describe("richTextPreview", () => {
  it("flattens Markdown to one line of text", () => {
    expect(
      richTextPreview("**Free** check-up\n\n- at [City Clinic](https://x.test)\n1. twice"),
    ).toBe("Free check-up at City Clinic twice");
  });
});
