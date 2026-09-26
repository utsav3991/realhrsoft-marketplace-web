"use client";

import { useEffect, useState } from "react";

/** `value` once it has stopped changing for `delay` ms, e.g. a search box's API query. */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
