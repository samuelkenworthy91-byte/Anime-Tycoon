import { useState } from "react";
import { SHEET_POS } from "../engine/data";
import { cn } from "../utils/cn";

/**
 * Renders a cast/staff portrait. Supports 2x2 sheet quadrants (pos 0-3).
 * Falls back to a styled initial tile if the image is missing or fails to load,
 * so the game stays presentable while art assets are being added.
 */
export default function Portrait({
  img,
  pos,
  name,
  className,
  style,
  alt,
}: {
  img: string;
  pos?: number;
  name?: string;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
}) {
  const [err, setErr] = useState(false);
  const initial = (name ?? "?").trim().charAt(0).toUpperCase() || "?";
  const palette = ["#ff4d8d", "#3be1ff", "#ffd166", "#5ef0c0", "#8b5cf6", "#ff8fc7"];
  const hash = (img + name).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const bg = palette[hash % palette.length];

  if (err) {
    return (
      <div
        className={cn("flex items-center justify-center font-display font-extrabold text-ink", className)}
        style={{ background: `linear-gradient(135deg, ${bg}, ${bg}99)`, borderRadius: "inherit" }}
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      src={img}
      alt={alt ?? name ?? ""}
      onError={() => setErr(true)}
      className={className}
      style={
        pos !== undefined
          ? { ...style, objectPosition: SHEET_POS[pos], objectFit: "cover" }
          : style
      }
    />
  );
}
