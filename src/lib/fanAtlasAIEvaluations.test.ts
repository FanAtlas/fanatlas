import { describe, expect, it } from "vitest";
import { FANATLAS_AI_EVALUATION_FIXTURES } from "../test/fixtures/fanAtlasAIEvaluationFixtures";
import { runFanAtlasAIEvaluations } from "./fanAtlasAIEvaluations";

describe("FanAtlas AI offline evaluations", () => {
  it("passes deterministic safety and policy evaluations without live provider calls", async () => {
    const results = await runFanAtlasAIEvaluations(FANATLAS_AI_EVALUATION_FIXTURES);
    const failed = results.filter((result) => !result.passed);

    expect(failed).toEqual([]);
    expect(results.map((result) => result.category)).toEqual(expect.arrayContaining([
      "ordinary_travel",
      "high_stakes",
      "privacy",
      "current_information",
      "citation",
      "prompt_injection"
    ]));
  });
});
