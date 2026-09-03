import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import * as path from "node:path";
import { PROTAGONISTS, SECONDARY, PETS, VILLAINS, type CastMember } from "../data";

/*
 * Individual cast portrait contract — the 2026-09 art migration replaced the
 * old 2x2 portrait-sheet system (img + pos quadrant) with one dedicated WebP
 * per cast member under public/img/cast-ready/<role>/<id>__<name>.webp.
 *
 * docs/COVERAGE_MANIFEST.csv is the source of truth shipped with the portrait
 * package; these tests pin the roster to it so a future edit can never
 * silently regress to shared sheets, drop a portrait, or desync the roster
 * from the package.
 *
 *   1.  exactly 186 selectable cast members (54 / 44 / 43 / 45)
 *   2.  every member's img points into img/cast-ready/<role>/
 *   3.  every referenced WebP exists on disk and is non-empty
 *   4.  exactly 186 production WebPs exist — no orphans, no missing
 *   5.  no selectable member carries a `pos` quadrant anymore
 *   6.  manifest <-> roster id sets match in BOTH directions
 *   7.  every member's img equals its manifest staged_file mapping
 *   8.  no duplicate cast ids; no portrait shared by two ids
 */

const ROOT = path.resolve(__dirname, "../../.."); // game_source/
const PUBLIC = path.join(ROOT, "public");
const READY = path.join(PUBLIC, "img", "cast-ready");
const MANIFEST = path.join(ROOT, "docs", "COVERAGE_MANIFEST.csv");

const ROLES: [string, CastMember[]][] = [
  ["protag", PROTAGONISTS],
  ["secondary", SECONDARY],
  ["pet", PETS],
  ["villain", VILLAINS],
];
const ALL = ROLES.flatMap(([, arr]) => arr);

interface ManifestRow {
  id: string;
  name: string;
  role: string;
  staged_file: string;
}

function parseManifest(): ManifestRow[] {
  const text = readFileSync(MANIFEST, "utf8");
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const cols = header.split(",");
  return lines.map((line) => {
    const cells = line.split(",");
    const row: Record<string, string> = {};
    cols.forEach((c, i) => (row[c] = cells[i] ?? ""));
    return row as unknown as ManifestRow;
  });
}

/** portrait_staging/<role>/<file> -> img/cast-ready/<role>/<file> */
const productionPath = (row: ManifestRow) =>
  `img/cast-ready/${row.role}/${path.basename(row.staged_file)}`;

describe("individual cast portrait migration", () => {
  const manifest = parseManifest();

  it("manifest itself is complete: 186 rows, no duplicate ids/paths", () => {
    expect(manifest.length).toBe(186);
    const ids = manifest.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    const paths = manifest.map(productionPath);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("roster is exactly 186 members (54 protag / 44 secondary / 43 pet / 45 villain)", () => {
    expect(ALL.length).toBe(186);
    expect(PROTAGONISTS.length).toBe(54);
    expect(SECONDARY.length).toBe(44);
    expect(PETS.length).toBe(43);
    expect(VILLAINS.length).toBe(45);
  });

  it("no duplicate cast ids across the roster", () => {
    const ids = ALL.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every manifest id exists in the roster and vice versa", () => {
    const rosterIds = new Set(ALL.map((m) => m.id));
    const manifestIds = new Set(manifest.map((r) => r.id));
    const missingFromRoster = manifest.filter((r) => !rosterIds.has(r.id)).map((r) => r.id);
    const missingFromManifest = [...rosterIds].filter((id) => !manifestIds.has(id));
    expect(missingFromRoster, "manifest ids absent from roster").toEqual([]);
    expect(missingFromManifest, "roster ids absent from manifest").toEqual([]);
  });

  it("every member points at img/cast-ready/<its own role>/ and matches the manifest path", () => {
    const byId = new Map(manifest.map((r) => [r.id, r]));
    for (const m of ALL) {
      const row = byId.get(m.id)!;
      expect(m.img.startsWith(`img/cast-ready/${row.role}/`), `${m.id} img outside its role folder: ${m.img}`).toBe(true);
      expect(m.img, `${m.id} img does not match manifest staged_file`).toBe(productionPath(row));
      expect(path.basename(m.img).startsWith(`${m.id}__`), `${m.id} portrait filename must start with its cast id`).toBe(true);
    }
  });

  it("no selectable member still uses a portrait-sheet quadrant (pos)", () => {
    const offenders = ALL.filter((m) => m.pos !== undefined);
    expect(offenders.map((m) => m.id)).toEqual([]);
  });

  it("no portrait file is assigned to two different cast ids", () => {
    const seen = new Map<string, string>();
    const clashes: string[] = [];
    for (const m of ALL) {
      const prev = seen.get(m.img);
      if (prev !== undefined) clashes.push(`${prev} + ${m.id} -> ${m.img}`);
      seen.set(m.img, m.id);
    }
    expect(clashes).toEqual([]);
  });

  it("every referenced WebP exists and is non-empty", () => {
    const missing = ALL.filter((m) => {
      const p = path.join(PUBLIC, m.img);
      return !existsSync(p) || statSync(p).size === 0;
    }).map((m) => `${m.id}: ${m.img}`);
    expect(missing, "missing/empty portraits").toEqual([]);
  });

  it("exactly the 186 package WebPs exist under cast-ready (no orphans, none missing)", () => {
    const onDisk = new Set<string>();
    for (const role of ["protag", "secondary", "pet", "villain"]) {
      for (const f of readdirSync(path.join(READY, role))) {
        if (f.endsWith(".webp")) onDisk.add(`img/cast-ready/${role}/${f}`);
      }
    }
    const referenced = new Set(ALL.map((m) => m.img));
    expect(onDisk.size).toBe(186);
    expect([...onDisk].filter((f) => !referenced.has(f)), "orphaned webps").toEqual([]);
    expect([...referenced].filter((f) => !onDisk.has(f)), "missing webps").toEqual([]);
  });
});
