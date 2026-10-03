import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import { RIVAL_STUDIOS } from '../data';
import catalog from '../generated/posterExpansion2026.json';
import { RIVAL_POSTERS, genericPosterOptions, rivalPostersForStudio, pickRivalPoster } from '../rivalPosters';
import { initRivalWorld, planRivalYear } from '../rivals';
const ids = new Set(catalog.posters.map(p => p.id));
describe('609-poster expansion', () => {
  it('ships every unique crop and exposes all 609 to players and every rival', () => {
    expect(ids.size).toBe(609);
    const playerIds = new Set(genericPosterOptions('shonen', ['mecha']).map(p => p.id));
    for (const p of catalog.posters) {
      const bytes = fs.readFileSync(path.join(process.cwd(), 'public', p.img));
      expect(bytes.subarray(0,4).toString()).toBe('RIFF');
      expect(bytes.subarray(8,12).toString()).toBe('WEBP');
      expect(playerIds.has(p.id)).toBe(true);
    }
    for (const studio of RIVAL_STUDIOS) {
      expect(rivalPostersForStudio(studio).filter(p => ids.has(p.id))).toHaveLength(609);
      for (const animeType of ['shonen','shojo'] as const) {
        const blocked = RIVAL_POSTERS.filter(p => !ids.has(p.id)).map(p => p.id);
        expect(ids.has(pickRivalPoster({studio, animeType, genres:['mecha'], blocked})!.id)).toBe(true);
      }
    }
  });
  it('removes player claims from both selections', () => {
    const p = catalog.posters[0];
    expect(genericPosterOptions('shonen', ['cyber'], undefined, [p.id]).some(x => x.id === p.id)).toBe(false);
    const blocked = RIVAL_POSTERS.map(x => x.id);
    expect(pickRivalPoster({studio:RIVAL_STUDIOS[0], animeType:'shonen', genres:['cyber'], blocked})).toBeNull();
  });
  it('reserves images across rival studios and historical releases', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    try {
      const world = initRivalWorld(0);
      world.studios = world.studios.map(s => ({...s, productions:[], franchises:[], releases:[]}));
      const blocked = RIVAL_POSTERS.filter(p => !ids.has(p.id)).map(p => p.id);
      const planned = planRivalYear(world, 1, 0, {blockedPosterIds:blocked}).world;
      const used = planned.studios.flatMap(s=>s.productions.map(p=>p.posterId)).filter(Boolean);
      expect(used.length).toBeGreaterThan(6); expect(new Set(used).size).toBe(used.length);
      const historical = {...planned, studios:planned.studios.map(s=>({...s, productions:[], releases:s.productions.map(p=>({...p, studioId:s.id, studio:s.name, revenue:0, fans:0, hallOfFame:false}))}))};
      const next = planRivalYear(historical, 2, 48, {blockedPosterIds:blocked}).world;
      expect(next.studios.flatMap(s=>s.productions).some(p=>used.includes(p.posterId))).toBe(false);
    } finally {random.mockRestore();}
  });
});
