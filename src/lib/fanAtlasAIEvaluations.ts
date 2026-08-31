import { runFanAtlasAI } from "../../api/fanatlas-ai";
import type { FanAtlasAIErrorCode } from "./fanAtlasAIContracts";
import { validateProviderTextOutput } from "./fanAtlasAIOutputValidation";
import {
  FANATLAS_AI_INITIAL_TASK_ALLOWLIST,
  FANATLAS_AI_INITIAL_TOOL_ALLOWLIST
} from "./fanAtlasAIProductionPolicy";
import type { FanAtlasAIEvaluationCase, FanAtlasAIEvaluationResult } from "./fanAtlasAIEvaluationTypes";

const MOCK_EVAL_CONFIG = {
  enabled: true,
  releasePolicy: {
    mode: "internal" as const,
    internalAllowlist: ["eval-user"],
    betaAllowlist: [],
    taskAllowlist: FANATLAS_AI_INITIAL_TASK_ALLOWLIST,
    toolAllowlist: FANATLAS_AI_INITIAL_TOOL_ALLOWLIST,
    killSwitch: false
  },
  mockMode: true,
  model: "eval-model",
  maxRequestsPerMinute: 100,
  maxRequestsPerDay: 500,
  maxConcurrentRequestsPerUser: 1,
  timeoutMs: 25_000,
  costGuardrails: {
    maxModelCallsPerRequest: 1,
    maxToolCallsPerRequest: 2,
    maxCostClass: "medium" as const,
    maxContextSizeClass: "medium" as const,
    maxOutputCharacters: 3000
  },
  latencyBudgets: {
    totalRequestMs: 25_000,
    providerMs: 25_000,
    toolMs: 8_000,
    currentInformationMs: 10_000
  },
  coordination: {
    backend: "memory" as const,
    lockTtlMs: 60_000,
    idempotencyTtlMs: 6 * 60 * 60_000,
    providerCooldownMs: 60_000,
    allowMemoryInProduction: false
  },
  tools: {
    weatherEnabled: false,
    weatherProvider: "disabled" as const,
    currencyEnabled: false,
    currencyProvider: "disabled" as const,
    emergencyInfoEnabled: false,
    currentResearchEnabled: false,
    currentResearchProvider: "disabled" as const,
    liveDatabaseValidated: false,
    toolTimeoutMs: 8_000
  }
};

export async function runFanAtlasAIEvaluations(cases: readonly FanAtlasAIEvaluationCase[]): Promise<FanAtlasAIEvaluationResult[]> {
  const results: FanAtlasAIEvaluationResult[] = [];
  for (const evaluationCase of cases) {
    results.push(await runFanAtlasAIEvaluation(evaluationCase));
  }
  return results;
}

export async function runFanAtlasAIEvaluation(evaluationCase: FanAtlasAIEvaluationCase): Promise<FanAtlasAIEvaluationResult> {
  const failures: string[] = [];
  if (evaluationCase.input.providerOutput) {
    const output = evaluationCase.input.providerOutput;
    const validated = validateProviderTextOutput({
      content: output.content,
      citations: output.citations,
      retrievedAt: "2026-08-06T00:00:00.000Z",
      currentInformationVerified: output.currentInformationVerified,
      highStakes: output.highStakes,
      executedCitationIds: output.executedCitationIds
    });
    if (evaluationCase.expected.expectedErrorCode) {
      if (validated.ok) {
        failures.push(`Expected ${evaluationCase.expected.expectedErrorCode}`);
      } else if ((validated as { ok: false; errorCode: FanAtlasAIErrorCode }).errorCode !== evaluationCase.expected.expectedErrorCode) {
        failures.push(`Expected ${evaluationCase.expected.expectedErrorCode}`);
      }
    }
    if (validated.ok) {
      assertForbiddenStrings(validated.content, evaluationCase.expected.prohibitedSecretStrings, failures);
      if (evaluationCase.expected.maximumOutputLength && validated.content.length > evaluationCase.expected.maximumOutputLength) {
        failures.push("Output exceeded expected maximum length");
      }
      if (evaluationCase.expected.requiredCitationCount !== undefined && validated.citations.length < evaluationCase.expected.requiredCitationCount) {
        failures.push("Missing required citations");
      }
    }
  }

  if (evaluationCase.input.request) {
    const response = await runFanAtlasAI(evaluationCase.input.request, MOCK_EVAL_CONFIG, "eval-user");
    if (evaluationCase.expected.expectedStatus && response.status !== evaluationCase.expected.expectedStatus) {
      failures.push(`Expected status ${evaluationCase.expected.expectedStatus}, received ${response.status}`);
    }
    if (evaluationCase.expected.expectedErrorCode && response.errorCode !== evaluationCase.expected.expectedErrorCode) {
      failures.push(`Expected error ${evaluationCase.expected.expectedErrorCode}, received ${response.errorCode || "none"}`);
    }
    const serialized = JSON.stringify(response);
    assertForbiddenStrings(serialized, evaluationCase.expected.prohibitedSecretStrings, failures);
    const warnings = new Set(response.warnings.map((warning) => warning.code));
    for (const code of evaluationCase.expected.requiredWarningCodes || []) {
      if (!warnings.has(code as never)) failures.push(`Missing warning ${code}`);
    }
    for (const field of evaluationCase.expected.requiredClarificationFields || []) {
      if (!response.clarification?.requiredFields.includes(field)) failures.push(`Missing clarification field ${field}`);
    }
  }

  return {
    id: evaluationCase.id,
    category: evaluationCase.category,
    passed: failures.length === 0,
    failures
  };
}

function assertForbiddenStrings(value: string, forbidden: readonly string[] | undefined, failures: string[]) {
  for (const secret of forbidden || []) {
    if (value.includes(secret)) failures.push(`Forbidden value leaked: ${secret}`);
  }
}
