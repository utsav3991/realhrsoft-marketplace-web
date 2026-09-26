import { create } from "qrcode";
import { useMemo } from "react";

import { cn } from "@/shared/lib/cn";

// Scanners need a light margin of four modules around the symbol.
const QUIET_ZONE = 4;

/**
 * A scannable QR code drawn as inline SVG. Always dark-on-white, whatever the theme, because
 * inverted codes fail on many scanners.
 */
export function QrCode({
  value,
  label,
  className,
}: {
  value: string;
  /** Accessible name, e.g. "QR code for your claim". */
  label: string;
  className?: string;
}) {
  const { size, path } = useMemo(() => {
    const { modules } = create(value, { errorCorrectionLevel: "M" });
    let d = "";
    for (let row = 0; row < modules.size; row++) {
      for (let col = 0; col < modules.size; col++) {
        if (modules.get(row, col)) d += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`;
      }
    }
    return { size: modules.size + QUIET_ZONE * 2, path: d };
  }, [value]);

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className={cn("size-48 rounded-md", className)}
    >
      <rect width={size} height={size} className="fill-white" />
      <path d={path} className="fill-black" />
    </svg>
  );
}
