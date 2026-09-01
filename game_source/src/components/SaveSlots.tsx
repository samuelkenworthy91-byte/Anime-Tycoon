import { Save, Trash2, FolderOpen, HardDriveDownload, Sparkles } from "lucide-react";
import { Btn } from "../fx/fx";
import { sfx } from "../engine/audio";
import { clearSlot, listSlots, saveAgeLabel, slotLabel, type SaveGame, type SlotId } from "../engine/storage";
import { dateLabel, formatGBP, formatNum } from "../engine/data";
import { cn } from "../utils/cn";

/* ------------------------------------------------------------- one slot */
function SlotRow({
  id,
  save,
  mode,
  onPick,
  onDelete,
  index,
}: {
  id: SlotId;
  save: SaveGame | null;
  mode: "load" | "save";
  onPick: (id: SlotId) => void;
  onDelete: (id: SlotId) => void;
  index: number;
}) {
  const auto = id === "auto";
  /* you can always load a full slot; you can save to anything except the
     autosave slot, which the game owns */
  const disabled = mode === "load" ? !save : auto;

  return (
    <div
      className={cn(
        "anim-up flex items-stretch gap-2 rounded-xl border p-2 transition-colors",
        disabled
          ? "border-line/50 bg-panel2/30 opacity-55"
          : save
            ? "border-gold/45 bg-gold/[0.06] hover:border-gold/80"
            : "border-cyanx/35 bg-cyanx/[0.05] hover:border-cyanx/70"
      )}
      style={{ animationDelay: `${index * 55}ms` }}
    >
      <button
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          sfx.select();
          onPick(id);
        }}
        className={cn(
          "btn-press min-w-0 flex-1 rounded-lg px-2.5 py-1.5 text-left",
          disabled && "cursor-not-allowed"
        )}
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-display shrink-0 text-[11px] font-extrabold tracking-[0.22em]",
              auto ? "text-cyanx" : save ? "text-gold" : "text-paper/45"
            )}
          >
            {slotLabel(id)}
          </span>
          {auto && <Sparkles size={11} className="shrink-0 text-cyanx/70" />}
          {save && (
            <span className="ml-auto shrink-0 text-[10px] text-paper/40">
              {saveAgeLabel(save.savedAt)}
            </span>
          )}
        </div>

        {save ? (
          <>
            <div className="mt-0.5 truncate text-sm font-bold text-paper">{save.summary.studio}</div>
            <div className="truncate text-[10.5px] leading-tight text-paper/60">
              {dateLabel(save.summary.week)} · {formatGBP(save.summary.cash)} ·{" "}
              {formatNum(save.summary.fans)} fans · {save.summary.shows} shows
            </div>
          </>
        ) : (
          <div className="mt-0.5 text-sm font-bold italic text-paper/35">
            {mode === "save" ? "Empty — tap to save here" : "Empty slot"}
          </div>
        )}
      </button>

      {save && !auto && (
        <button
          aria-label={`Delete ${slotLabel(id)}`}
          onClick={() => {
            sfx.back();
            clearSlot(id);
            onDelete(id);
          }}
          className="btn-press shrink-0 rounded-lg border border-line px-2 text-paper/40 hover:border-neon hover:text-neon"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ slot list */
export default function SaveSlots({
  mode,
  onPick,
  onChanged,
  refreshKey,
}: {
  mode: "load" | "save";
  onPick: (id: SlotId) => void;
  /** called after a slot is deleted so the parent can re-render */
  onChanged?: () => void;
  /** change to force the list to re-read localStorage */
  refreshKey?: number;
}) {
  const slots = listSlots();
  const anySave = slots.some((s) => s.save);

  return (
    <div key={refreshKey} className="space-y-2">
      <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.25em] text-paper/45">
        {mode === "load" ? <FolderOpen size={12} /> : <HardDriveDownload size={12} />}
        {mode === "load" ? "CHOOSE A SAVE TO RESUME" : "CHOOSE A SLOT TO WRITE TO"}
      </div>

      {slots.map((s, i) => (
        <SlotRow
          key={s.id}
          id={s.id}
          save={s.save}
          mode={mode}
          index={i}
          onPick={onPick}
          onDelete={() => onChanged?.()}
        />
      ))}

      {mode === "load" && !anySave && (
        <div className="rounded-xl border border-line/60 bg-panel2/40 px-3 py-4 text-center text-[11px] leading-relaxed text-paper/50">
          <Save size={16} className="mx-auto mb-1.5 text-paper/30" />
          No saved careers yet.
          <br />
          Found a studio — the game autosaves as you play, and you can write to a
          slot any time from the pause menu.
        </div>
      )}
    </div>
  );
}

export { Btn };
