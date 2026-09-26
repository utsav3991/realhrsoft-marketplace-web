import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { DataTable, type DataTableColumns, type SortOrdering } from "./data-table";

interface Row {
  id: string;
  name: string;
  count: number | null;
}

const COLUMNS: DataTableColumns<Row> = [
  {
    id: "name",
    header: "Name",
    sortKey: "name",
    sortValue: (row) => row.name,
    cell: (row) => row.name,
  },
  {
    id: "count",
    header: "Count",
    sortKey: "count",
    sortValue: (row) => row.count,
    cell: (row) => row.count ?? "—",
  },
  { id: "id", header: "Id", cell: (row) => row.id },
];

const ROWS: Row[] = [
  { id: "1", name: "beta", count: 2 },
  { id: "2", name: "Alpha", count: null },
  { id: "3", name: "gamma", count: 10 },
];

function names() {
  return screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[0]?.textContent);
}

/** Holds the ordering the way `useSortParam` does, without a router. */
function Sortable({ rows = ROWS }: { rows?: Row[] }) {
  const [value, setValue] = useState<SortOrdering | null>(null);
  return (
    <DataTable
      aria-label="Rows"
      columns={COLUMNS}
      rows={rows}
      rowKey={(row) => row.id}
      sort={{ value, onChange: setValue }}
    />
  );
}

describe("<DataTable> sorting", () => {
  it("cycles a header through ascending, descending and the default order", async () => {
    const user = userEvent.setup();
    render(<Sortable />);
    const header = screen.getByRole("columnheader", { name: /Name/ });
    expect(header).not.toHaveAttribute("aria-sort");
    expect(names()).toEqual(["beta", "Alpha", "gamma"]);

    await user.click(within(header).getByRole("button"));
    expect(header).toHaveAttribute("aria-sort", "ascending");
    expect(names()).toEqual(["Alpha", "beta", "gamma"]);

    await user.click(within(header).getByRole("button"));
    expect(header).toHaveAttribute("aria-sort", "descending");
    expect(names()).toEqual(["gamma", "beta", "Alpha"]);

    await user.click(within(header).getByRole("button"));
    expect(header).not.toHaveAttribute("aria-sort");
    expect(names()).toEqual(["beta", "Alpha", "gamma"]);
  });

  it("sorts numbers numerically with blanks last either way", async () => {
    const user = userEvent.setup();
    render(<Sortable />);
    const sortButton = within(screen.getByRole("columnheader", { name: /Count/ })).getByRole(
      "button",
    );
    await user.click(sortButton);
    expect(names()).toEqual(["beta", "gamma", "Alpha"]);
    await user.click(sortButton);
    expect(names()).toEqual(["gamma", "beta", "Alpha"]);
  });

  it("leaves columns without a sortKey as plain headers", () => {
    render(<Sortable />);
    expect(
      within(screen.getByRole("columnheader", { name: "Id" })).queryByRole("button"),
    ).not.toBeInTheDocument();
  });

  it("asks the caller to sort server rows instead of reordering them", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <DataTable
        aria-label="Rows"
        columns={[{ id: "name", header: "Name", sortKey: "name", cell: (row: Row) => row.name }]}
        rows={ROWS}
        rowKey={(row) => row.id}
        sort={{ value: "-name", onChange }}
      />,
    );
    expect(names()).toEqual(["beta", "Alpha", "gamma"]);
    await user.click(screen.getByRole("button", { name: /Name/ }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});

describe("<DataTable> pages", () => {
  const many = Array.from({ length: 120 }, (_, index) => ({
    id: String(index),
    name: `row ${String(index).padStart(3, "0")}`,
    count: index,
  }));

  it("pages rows it holds in the browser", async () => {
    const user = userEvent.setup();
    render(<Sortable rows={many} />);
    expect(screen.getAllByRole("row")).toHaveLength(11);
    expect(screen.getByText("Showing 1-10 of 120 results")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("Showing 11-20 of 120 results")).toBeInTheDocument();
    expect(names()[0]).toBe("row 010");
  });

  it("shows 10 rows per page by default", () => {
    render(<Sortable rows={many} />);
    expect(screen.getByRole("combobox", { name: "Rows per page" })).toHaveTextContent(
      "10 per page",
    );
  });

  it("keeps the pager when one page holds every row", () => {
    render(<Sortable />);
    expect(screen.getByText("Showing 1-3 of 3 results")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("reports server page changes and keeps the rows it was given", async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(
      <DataTable
        aria-label="Rows"
        columns={COLUMNS}
        rows={ROWS}
        rowKey={(row) => row.id}
        pagination={{
          page: 2,
          pageSize: 20,
          total: 203,
          pageSizes: [10, 20, 50, 100],
          onPageChange,
          onPageSizeChange: vi.fn(),
        }}
      />,
    );
    expect(screen.getByText("Showing 21-40 of 203 results")).toBeInTheDocument();
    expect(names()).toEqual(["beta", "Alpha", "gamma"]);
    const pager = screen.getByRole("navigation", { name: "Pagination" });
    await user.click(within(pager).getByRole("button", { name: "Next page" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
