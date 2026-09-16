import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
function replaceOnce(relativePath, before, after) {
  const path = resolve(root, relativePath);
  const source = readFileSync(path, "utf8");
  if (source.includes(after)) return false;
  if (!source.includes(before)) throw new Error(`Finalize patch anchor missing in ${relativePath}`);
  writeFileSync(path, source.replace(before, after));
  return true;
}
let changed = false;

// Protected recovery: rare project-wide bubbles must not visually come from staff who are unavailable.
changed = replaceOnce(
  "src/engine/state.ts",
  '    const face = r.staff.find((st) => production.staffIds.includes(st.id));\n    const actorId = face?.id ?? "showrunner";',
  '    const face = r.staff.find((st) => production.staffIds.includes(st.id) && liveWorkEligible(r, st));\n    const actorId = face?.id ?? "showrunner";',
) || changed;

// Unified staff-request presentation queue in App, deferred below major reveals but above level-ups.
changed = replaceOnce(
  "src/App.tsx",
  'import BigThreeReveal from "./components/BigThreeReveal";\nimport { appointCreativeLead, expansionOf } from "./engine/studioExpansion";',
  'import BigThreeReveal from "./components/BigThreeReveal";\nimport StaffRequestOverlay, { nextStaffRequestId } from "./components/StaffRequestOverlay";\nimport { appointCreativeLead, expansionOf } from "./engine/studioExpansion";',
) || changed;
changed = replaceOnce(
  "src/App.tsx",
  '  const [controlsOpen, setControlsOpen] = useState(false);\n  /* GDS-style live studio clock: one in-game day = 10 real seconds at 1×. */',
  '  const [controlsOpen, setControlsOpen] = useState(false);\n  const [dismissedStaffRequests, setDismissedStaffRequests] = useState<string[]>([]);\n  const dismissedStaffRequestSet = useMemo(() => new Set(dismissedStaffRequests), [dismissedStaffRequests]);\n  useEffect(() => { if ((run?.week ?? -1) === 0) setDismissedStaffRequests([]); }, [run?.week]);\n  /* GDS-style live studio clock: one in-game day = 10 real seconds at 1×. */',
) || changed;
changed = replaceOnce(
  "src/App.tsx",
  '  const nominationAnnouncementOpen = !!nominationAnnouncement && screen === "office" && !paused && !sellerAuctionOpen && (run?.studioEvents.length ?? 0) === 0 && !run?.ipMarket.pendingPromptId && !bigThreeRevealOpen;\n  const levelUpPresentationAllowed = canPresentDeferredLevelUp({',
  '  const nominationAnnouncementOpen = !!nominationAnnouncement && screen === "office" && !paused && !sellerAuctionOpen && (run?.studioEvents.length ?? 0) === 0 && !run?.ipMarket.pendingPromptId && !bigThreeRevealOpen;\n  const pendingStaffRequestId = run ? nextStaffRequestId(run, dismissedStaffRequestSet) : null;\n  const staffRequestPresentationOpen = !!pendingStaffRequestId && screen === "office" && !paused && !sellerAuctionOpen && (run?.studioEvents.length ?? 0) === 0 && !run?.ipMarket.pendingPromptId && !bigThreeRevealOpen && !nominationAnnouncementOpen && !released;\n  const levelUpPresentationAllowed = canPresentDeferredLevelUp({',
) || changed;
changed = replaceOnce(
  "src/App.tsx",
  '  }) && !nominationAnnouncementOpen && !bigThreeRevealOpen && !released;',
  '  }) && !nominationAnnouncementOpen && !bigThreeRevealOpen && !staffRequestPresentationOpen && !released;',
) || changed;
changed = replaceOnce(
  "src/App.tsx",
  '  useEffect(() => {\n    if (bigThreeRevealOpen) setTimeSpeed(0);\n  }, [bigThreeRevealOpen]);\n  useEffect(() => { if (sellerAuctionOpen) setTimeSpeed(0); }, [sellerAuctionOpen]);',
  '  useEffect(() => {\n    if (bigThreeRevealOpen) setTimeSpeed(0);\n  }, [bigThreeRevealOpen]);\n  useEffect(() => { if (staffRequestPresentationOpen) setTimeSpeed(0); }, [staffRequestPresentationOpen]);\n  useEffect(() => { if (sellerAuctionOpen) setTimeSpeed(0); }, [sellerAuctionOpen]);',
) || changed;
changed = replaceOnce(
  "src/App.tsx",
  '        {run && nominationAnnouncementOpen && (\n          <AwardsNominationAnnouncement run={run} setRun={(fn) => setRun((r) => (r ? fn(r) : r))} />\n        )}\n\n        {run && levelUpPresentationAllowed',
  '        {run && nominationAnnouncementOpen && (\n          <AwardsNominationAnnouncement run={run} setRun={(fn) => setRun((r) => (r ? fn(r) : r))} />\n        )}\n\n        {run && staffRequestPresentationOpen && (\n          <StaffRequestOverlay\n            run={run}\n            setRun={(fn) => setRun((r) => (r ? fn(r) : r))}\n            dismissed={dismissedStaffRequestSet}\n            onDismiss={(id) => setDismissedStaffRequests((current) => current.includes(id) ? current : [...current, id])}\n          />\n        )}\n\n        {run && levelUpPresentationAllowed',
) || changed;

// Staff dock badge includes every unresolved request, not only salary/poach events.
changed = replaceOnce(
  "src/components/Office.tsx",
  'import CrewPanel from "./Crew";\nimport MarketPanel from "./Market";',
  'import CrewPanel from "./Crew";\nimport { totalStaffRequestCount } from "./StaffRequestOverlay";\nimport MarketPanel from "./Market";',
) || changed;
changed = replaceOnce(
  "src/components/Office.tsx",
  '            {run.staffEvents.length > 0 && (\n              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 font-display text-[8px] font-extrabold text-ink">{run.staffEvents.length}</span>\n            )}',
  '            {totalStaffRequestCount(run) > 0 && (\n              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 font-display text-[8px] font-extrabold text-ink">{totalStaffRequestCount(run)}</span>\n            )}',
) || changed;

// Player-facing hype is always rounded upward; mechanics retain their precise value.
changed = replaceOnce(
  "src/components/Projects.tsx",
  '          <Flame size={10} /> {p.hype}',
  '          <Flame size={10} /> {Math.ceil(p.hype)}',
) || changed;
changed = replaceOnce(
  "src/engine/scoring.ts",
  'final hype ${Math.round(hype)}',
  'final hype ${Math.ceil(hype)}',
) || changed;

// Normalise apparent sprite height from the alpha bounds rather than the asset canvas.
changed = replaceOnce(
  "src/components/OfficeScene.tsx",
  'interface Body {\n  home: { x: number; y: number };\n  pos: { x: number; y: number };\n  target: { x: number; y: number };\n  /** seconds the current move should take */\n  dur: number;\n  flip: boolean;\n}\n\n/* --------------------------------------------------------------- sprite */',
  'interface Body {\n  home: { x: number; y: number };\n  pos: { x: number; y: number };\n  target: { x: number; y: number };\n  /** seconds the current move should take */\n  dur: number;\n  flip: boolean;\n}\n\ntype SpriteMetric = { scale: number; shift: number };\nconst DEFAULT_SPRITE_METRIC: SpriteMetric = { scale: 1, shift: 0 };\nconst spriteMetricCache = new Map<string, SpriteMetric>();\nfunction measureSprite(img: HTMLImageElement): SpriteMetric {\n  const cached = spriteMetricCache.get(img.currentSrc || img.src);\n  if (cached) return cached;\n  try {\n    const ratio = Math.min(1, 128 / Math.max(1, img.naturalHeight));\n    const w = Math.max(1, Math.round(img.naturalWidth * ratio));\n    const h = Math.max(1, Math.round(img.naturalHeight * ratio));\n    const canvas = document.createElement("canvas");\n    canvas.width = w; canvas.height = h;\n    const ctx = canvas.getContext("2d", { willReadFrequently: true });\n    if (!ctx) return DEFAULT_SPRITE_METRIC;\n    ctx.drawImage(img, 0, 0, w, h);\n    const data = ctx.getImageData(0, 0, w, h).data;\n    let minY = h, maxY = -1;\n    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {\n      if (data[(y * w + x) * 4 + 3] > 24) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }\n    }\n    if (maxY < minY) return DEFAULT_SPRITE_METRIC;\n    const visible = Math.max(0.01, (maxY - minY + 1) / h);\n    const bottomPad = Math.max(0, (h - 1 - maxY) / h);\n    const metric = { scale: Math.max(0.84, Math.min(1.28, 0.82 / visible)), shift: Math.min(16, bottomPad * 100) };\n    spriteMetricCache.set(img.currentSrc || img.src, metric);\n    return metric;\n  } catch {\n    return DEFAULT_SPRITE_METRIC;\n  }\n}\n\n/* --------------------------------------------------------------- sprite */',
) || changed;
changed = replaceOnce(
  "src/components/OfficeScene.tsx",
  '  const [err, setErr] = useState(false);\n  useEffect(() => {',
  '  const [err, setErr] = useState(false);\n  const [spriteMetric, setSpriteMetric] = useState<SpriteMetric>(() => spriteMetricCache.get(src) ?? DEFAULT_SPRITE_METRIC);\n  useEffect(() => setSpriteMetric(spriteMetricCache.get(src) ?? DEFAULT_SPRITE_METRIC), [src]);\n  useEffect(() => {',
) || changed;
changed = replaceOnce(
  "src/components/OfficeScene.tsx",
  '            onError={() => setErr(true)}\n            className="h-full w-auto select-none drop-shadow-[0_6px_10px_rgba(8,6,20,.55)]"\n            style={{\n              transform: body.flip ? "scaleX(-1)" : undefined,',
  '            onError={() => setErr(true)}\n            onLoad={(event) => setSpriteMetric(measureSprite(event.currentTarget))}\n            className="h-full w-auto select-none drop-shadow-[0_6px_10px_rgba(8,6,20,.55)]"\n            style={{\n              transform: `translateY(${spriteMetric.shift}%) scale(${spriteMetric.scale})${body.flip ? " scaleX(-1)" : ""}`,\n              transformOrigin: "50% 100%",',
) || changed;

// Avoid relying on the global React namespace in the new overlay.
changed = replaceOnce(
  "src/components/StaffRequestOverlay.tsx",
  'import { X } from "lucide-react";',
  'import type { ReactNode } from "react";\nimport { X } from "lucide-react";',
) || changed;
changed = replaceOnce(
  "src/components/StaffRequestOverlay.tsx",
  'function Shell({ title, onDismiss, children }: { title: string; onDismiss: () => void; children: React.ReactNode }) {',
  'function Shell({ title, onDismiss, children }: { title: string; onDismiss: () => void; children: ReactNode }) {',
) || changed;

console.log(changed ? "Final QoL source patches applied." : "Final QoL source patches already present.");
