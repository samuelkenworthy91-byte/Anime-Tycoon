import { restoreAwardNominationMetadata } from "./awardCycle";
import { syncBigThreeEra } from "./bigThree";
import { MAX_WEEKS, migrateRun, type RunState } from "./state";
import { slotLabel, type SaveData, type SaveGame, type SlotId } from "./storage";

export interface SessionClock {
  day: number;
  phase: number;
  acc: number;
  dayCount: number;
}

export interface SessionMeta {
  studio: string;
  showrunner: string;
}

/** Build the storage payload in one place so autosave, manual save and tests
 * all agree on exactly what constitutes a resumable career snapshot. */
export function buildSaveData(
  run: RunState,
  meta: SessionMeta,
  clock: SessionClock,
): SaveData {
  return {
    run,
    meta,
    clock,
    summary: {
      studio: run.studio,
      week: run.week,
      cash: run.cash,
      fans: run.fans,
      shows: run.showsMade,
      officeLevel: run.officeLevel,
    },
  };
}

/** Storage validates the envelope; engine migration and presentation metadata
 * restoration belong here, not spread across App component callbacks. */
export function restoreRunFromSave(save: SaveGame, slot: SlotId): RunState {
  const migrated = migrateRun(save.run);
  const restored = restoreAwardNominationMetadata(migrated, migrated.yearShows);
  let resumed = syncBigThreeEra(restored);
  if (save.recoveredFrom) {
    const source =
      save.recoveredFrom === "legacy-version"
        ? "a migratable older-version save"
        : save.recoveredFrom === "backup1"
          ? "the newest recovery snapshot"
          : "the second recovery snapshot";
    resumed = {
      ...resumed,
      notices: [
        ...resumed.notices,
        `💾 SAVE RECOVERY · the primary ${slotLabel(slot)} copy was unreadable, so the game restored ${source}.`,
      ].slice(-40),
    };
  }
  return resumed;
}

/** Transient minigames/modals never resume directly from disk. */
export function safeResumeScreen(run: Pick<RunState, "week" | "dynasty">): "office" | "retrospective" {
  return run.week >= MAX_WEEKS && !run.dynasty ? "retrospective" : "office";
}
