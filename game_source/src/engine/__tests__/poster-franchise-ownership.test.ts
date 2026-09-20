import { describe, expect, it } from "vitest";
import { PROTAGONISTS, SECONDARY, PETS, VILLAINS, type Draft } from "../data";
import { makeProject, type Project } from "../projects";
import { genericPosterOptions } from "../rivalPosters";
import {
  initialRun,
  latestFranchisePosterId,
  unavailablePosterIdsForProject,
  type RunState,
} from "../state";

const draft = (title: string, posterArtId?: string): Draft => ({
  title,
  medium: "fanweb",
  budget: "indie",
  scope: "short",
  slot: "web",
  animeType: "shonen",
  genres: ["slice"],
  audience: "teens",
  protag: PROTAGONISTS[0].id,
  protagName: PROTAGONISTS[0].name,
  secondary: SECONDARY[0].id,
  secondaryName: SECONDARY[0].name,
  pet: PETS[0].id,
  petName: PETS[0].name,
  villain: VILLAINS[0].id,
  villainName: VILLAINS[0].name,
  arcs: ["hook", "finale"],
  sliders: [50, 50, 50],
  season: 1,
  posterArtId,
});

const emptyRivalSlate = (run: RunState): RunState => ({
  ...run,
  rivalWorld: {
    ...run.rivalWorld,
    studios: run.rivalWorld.studios.map((studio) => ({
      ...studio,
      productions: [],
      franchises: [],
      releases: [],
    })),
  },
});

describe("franchise poster ownership", () => {
  it("lets one franchise reuse its own poster while blocking another franchise's poster", () => {
    const posters = genericPosterOptions("shonen", ["slice"]);
    expect(posters.length).toBeGreaterThanOrEqual(2);
    const ownPoster = posters[0].id;
    const otherPoster = posters[1].id;

    let run = emptyRivalSlate(initialRun("Poster Studio", "steady"));
    const alpha: Project = {
      ...makeProject(draft("Alpha", ownPoster), 0, 0),
      stage: "done",
      airedWeek: 8,
    };
    const beta: Project = {
      ...makeProject(draft("Beta", otherPoster), 4, 28),
      stage: "done",
      airedWeek: 12,
    };
    const sequel: Project = {
      ...makeProject({
        ...draft("Alpha S2", ownPoster),
        franchiseKey: "Alpha",
        continuation: "season",
        season: 2,
      }, 16, 112),
      stage: "ready",
    };

    run = {
      ...run,
      projects: [alpha, beta, sequel],
      playerPosterClaims: [ownPoster, otherPoster],
    };

    const blocked = unavailablePosterIdsForProject(run, sequel);
    expect(blocked).not.toContain(ownPoster);
    expect(blocked).toContain(otherPoster);
  });

  it("treats a rival franchise poster as unavailable to a new player franchise", () => {
    const poster = genericPosterOptions("shonen", ["slice"])[0].id;
    let run = emptyRivalSlate(initialRun("Poster Studio", "steady"));
    run = {
      ...run,
      rivalWorld: {
        ...run.rivalWorld,
        studios: run.rivalWorld.studios.map((studio, index) => index === 0 ? {
          ...studio,
          franchises: [{
            key: "rival-ip",
            baseTitle: "Rival IP",
            genres: ["slice"],
            animeType: "shonen",
            season: 1,
            popularity: 60,
            bestScore: 28,
            lastScore: 28,
            lastEntryWeek: 8,
            entries: 1,
            posterId: poster,
          }],
        } : studio),
      },
    };
    const project = makeProject(draft("New Player IP"), 12, 84);
    expect(unavailablePosterIdsForProject(run, project)).toContain(poster);
  });

  it("finds the latest franchise poster used to seed continuation drafts", () => {
    const posters = genericPosterOptions("shonen", ["slice"]);
    const firstPoster = posters[0].id;
    const latestPoster = posters[1].id;
    let run = emptyRivalSlate(initialRun("Poster Studio", "steady"));
    const first: Project = {
      ...makeProject(draft("Alpha", firstPoster), 0, 0),
      stage: "done",
      airedWeek: 8,
    };
    const later: Project = {
      ...makeProject({
        ...draft("Alpha: The Movie", latestPoster),
        franchiseKey: "Alpha",
        continuation: "movie",
      }, 12, 84),
      stage: "done",
      airedWeek: 20,
    };
    run = { ...run, projects: [first, later] };

    expect(latestFranchisePosterId(run, "Alpha")).toBe(latestPoster);
  });
});
