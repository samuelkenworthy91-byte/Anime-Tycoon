import { build } from "esbuild";
import { writeFile, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const temp = "./.auction-ip-data.tmp.mjs";
await build({ entryPoints:["src/engine/ip.ts"], outfile:temp, bundle:true, platform:"node", format:"esm", external:["lucide-react"] });
const { AUCTION_IPS } = await import(`${pathToFileURL(temp).href}?v=${Date.now()}`);
const quote = (v) => `"${String(v ?? "").replaceAll('"','""')}"`;
const columns = ["id","title","sourceType","description","genres","tones","audience","animeType","rarity","fanbase","prestige","merchPotential","adaptationDifficulty","rightsBaseValue","royaltyRate","characters","adaptationArcs","specialArcUnlock","posterAsset","posterPalette","specialRules"];
const rows = AUCTION_IPS.map((ip) => [ip.id,ip.title,ip.sourceType,ip.description,ip.genreTags.join("|"),ip.toneTags.join("|"),ip.audience,ip.animeType,ip.rarity,ip.fanbase,ip.prestige,ip.merchPotential,ip.adaptationDifficulty,ip.rightsBaseValue,ip.royaltyRate,ip.characters.map((c)=>`${c.role}:${c.name}`).join("|"),ip.availableArcs.map((a)=>a.name).join("|"),ip.specialArcUnlock,ip.posterAsset,ip.posterPalette.join("|"),ip.specialRules.join("|")]);
await writeFile("docs/AUCTION_IP_MANIFEST.csv", [columns.map(quote).join(","),...rows.map((row)=>row.map(quote).join(","))].join("\n")+"\n");
await unlink(temp);
console.log(`Exported ${rows.length} auction IPs.`);
