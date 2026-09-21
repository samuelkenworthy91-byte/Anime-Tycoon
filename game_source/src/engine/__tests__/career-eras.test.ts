import { describe, expect, it } from "vitest";
import { CAREER_WEEKS, WEEKS_PER_YEAR } from "../data";
import { careerEraForWeek, careerProgress, careerYearForWeek } from "../careerEras";

describe("25-year career eras", () => {
  it("maps the five career eras deterministically", () => {
    expect(careerEraForWeek(0).id).toBe("founding");
    expect(careerEraForWeek(3 * WEEKS_PER_YEAR).id).toBe("breakthrough");
    expect(careerEraForWeek(7 * WEEKS_PER_YEAR).id).toBe("major");
    expect(careerEraForWeek(12 * WEEKS_PER_YEAR).id).toBe("global");
    expect(careerEraForWeek(18 * WEEKS_PER_YEAR).id).toBe("legacy");
    expect(careerEraForWeek(CAREER_WEEKS).id).toBe("sandbox");
  });
  it("keeps calendar maths single-source", () => {
    expect(careerYearForWeek(0)).toBe(1);
    expect(careerYearForWeek(WEEKS_PER_YEAR)).toBe(2);
    expect(careerProgress(CAREER_WEEKS)).toBe(1);
  });
});
