"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";

import { Input } from "@/design-system/primitives/input";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useUrlParams } from "@/shared/hooks/use-url-params";

interface SearchFieldProps {
  placeholder?: string;
  "aria-label"?: string;
  className?: string;
  paramName?: string;
}

export function SearchField({
  placeholder = "Search",
  "aria-label": ariaLabel,
  className,
  paramName = "search",
}: SearchFieldProps) {
  const { searchParams, set } = useUrlParams();
  const initialSearch = searchParams.get(paramName) ?? "";
  const [value, setValue] = useState(initialSearch);
  const debounced = useDebouncedValue(value, 300);

  useEffect(() => {
    // Only update the URL if the debounced value is different from what's already there
    // This prevents setting the URL on initial mount if they are the same
    if (debounced.trim() !== (initialSearch || "")) {
      set({ [paramName]: debounced.trim() || null });
    }
  }, [debounced, initialSearch, set, paramName]);

  return (
    <div className={`relative flex w-full max-w-sm items-center ${className || ""}`}>
      <Search className="text-muted-foreground absolute left-3 size-4" aria-hidden />
      <Input
        type="search"
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="pl-9"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}
