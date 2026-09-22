import { HelpCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import FirstSeenTutorial from "./FirstSeenTutorial";
import type { TutorialId } from "../engine/tutorials";

const CONTEXT_TUTORIAL_KEY = "kirameki.context-tutorials.v1";

const FIRST_SIGHT: readonly { id: TutorialId; marker: string }[] = [
  { id: "slate-planning", marker: "STUDIO SLATE & DEPARTMENT LOAD" },
  { id: "staff-relationships", marker: "RELATIONSHIPS" },
  { id: "career-era-delegation", marker: "EXECUTIVE DELEGATION" },
] as const;

const REPLAY_CONTEXTS: readonly { id: TutorialId; marker: string; label: string }[] = [
  { id: "slate-planning", marker: "STUDIO SLATE & DEPARTMENT LOAD", label: "SLATE" },
  { id: "review-diagnosis", marker: "WHAT WE LEARNED", label: "REVIEWS" },
  { id: "research-disciplines", marker: "STUDIO DISCIPLINES", label: "R&D" },
  { id: "publicity-audience", marker: "PUBLICITY · LAUNCH", label: "PUBLICITY" },
  { id: "merch-bets", marker: "MERCHANDISING · TIER", label: "MERCH" },
  { id: "industry-movements", marker: "CULTURAL MOVEMENT ·", label: "TRENDS" },
  { id: "staff-relationships", marker: "RELATIONSHIPS", label: "RELATIONSHIPS" },
  { id: "rival-memories", marker: "WHAT THEY REMEMBER", label: "RIVALS" },
  { id: "studio-reputation", marker: "INDUSTRY REPUTATION · EARNED, NOT CHOSEN", label: "REPUTATION" },
  { id: "career-era-delegation", marker: "EXECUTIVE DELEGATION", label: "DELEGATION" },
] as const;

function readSeen(): Set<TutorialId> {
  try {
    const raw = localStorage.getItem(CONTEXT_TUTORIAL_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function remember(id: TutorialId) {
  try {
    const seen = readSeen();
    seen.add(id);
    localStorage.setItem(CONTEXT_TUTORIAL_KEY, JSON.stringify([...seen]));
  } catch {
    /* storage is optional; the current modal can still close normally */
  }
}

function visibleText(): string {
  return document.body?.innerText ?? "";
}

function ExtrasHost() {
  const [revision, setRevision] = useState(0);
  const [tutorial, setTutorial] = useState<TutorialId | null>(null);
  const text = useMemo(() => visibleText(), [revision]);

  useEffect(() => {
    const observer = new MutationObserver(() => setRevision((value) => value + 1));
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    const timer = window.setInterval(() => setRevision((value) => value + 1), 900);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (tutorial) return;
    if (document.querySelector('[data-first-seen-tutorial="true"]')) return;
    const seen = readSeen();
    const hit = FIRST_SIGHT.find((entry) => !seen.has(entry.id) && text.includes(entry.marker));
    if (hit) setTutorial(hit.id);
  }, [revision, text, tutorial]);

  const replay = REPLAY_CONTEXTS.find((entry) => text.includes(entry.marker));

  return (
    <>
      {replay && !tutorial && !document.querySelector('[data-first-seen-tutorial="true"]') && (
        <button
          type="button"
          onClick={() => setTutorial(replay.id)}
          className="btn-press fixed bottom-[72px] right-3 z-[70] flex min-h-11 items-center gap-1.5 rounded-xl border border-cyanx/50 bg-ink/95 px-3 text-[9px] font-extrabold text-cyanx shadow-[0_8px_30px_rgba(0,0,0,.5)] backdrop-blur-md"
          aria-label={`How ${replay.label.toLowerCase()} works`}
        >
          <HelpCircle size={14} /> HOW THIS WORKS · {replay.label}
        </button>
      )}
      {tutorial && (
        <FirstSeenTutorial
          id={tutorial}
          open
          onDismiss={() => {
            remember(tutorial);
            setTutorial(null);
            setRevision((value) => value + 1);
          }}
        />
      )}
    </>
  );
}

let mounted = false;
function mount() {
  if (mounted || typeof document === "undefined") return;
  if (!document.body) {
    window.setTimeout(mount, 20);
    return;
  }
  mounted = true;
  const node = document.createElement("div");
  node.id = "anime-runner-context-tutorial-extras";
  document.body.appendChild(node);
  createRoot(node).render(<ExtrasHost />);
}

if (typeof window !== "undefined") window.setTimeout(mount, 0);
