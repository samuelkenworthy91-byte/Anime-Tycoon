import { useState } from "react";
import { cn } from "../utils/cn";

/**
 * Renders a cast/staff portrait. Character sheets are 2x2 grids; the inner
 * <img> is sized 200% x 200% of the tile and shifted by exactly one tile
 * (top/left -100%) so ONLY the requested quadrant (pos 0-3) is visible.
 * This crops reliably for any tile aspect ratio, unlike object-position.
 * Falls back to a styled initial tile if the image is missing or fails to
 * load, so the game stays presentable while art assets are being added.
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

  if (pos === undefined) {
    /* whole image, cover-cropped */
    return (
      <img
        src={img}
        alt={alt ?? name ?? ""}
        onError={() => setErr(true)}
        className={cn("object-cover", className)}
        style={style}
      />
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)} style={style}>
      {!err && (
        <img
          src={img}
          alt={alt ?? name ?? ""}
          onError={() => setErr(true)}
          className="absolute max-w-none"
          style={{
            width: "200%",
            height: "200%",
            top: pos >= 2 ? "-100%" : "0",
            left: pos % 2 === 1 ? "-100%" : "0",
          }}
        />
      )}
      {err && (
        <div
          className="absolute inset-0 flex items-center justify-center font-display font-extrabold text-ink"
          style={{ background: `linear-gradient(135deg, ${bg}, ${bg}99)` }}
        >
          {initial}
        </div>
      )}
    </div>
  );
}
