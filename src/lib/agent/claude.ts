import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db";
import { costMicroUsd } from "./cost";

// Model agenta; tańszy można ustawić zmienną AGENT_MODEL (np. claude-sonnet-5-5 albo claude-haiku-5-5)
export const AGENT_MODEL = process.env.AGENT_MODEL || "claude-opus-5-5";

export function agentEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | undefined;
export function anthropic() {
  return (client ??= new Anthropic());
}

type Usage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
};

/** Zapisuje wywołanie w dzienniku (koszt albo błąd), żeby panel pokazywał wydatki. */
export async function logRun(task: string, subjectId: string | null, model: string, usage?: Usage, error?: unknown) {
  const input = usage ? usage.input_tokens + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0) : 0;
  const output = usage?.output_tokens ?? 0;
  await db.agentRun.create({
    data: {
      task,
      subjectId,
      model,
      inputTokens: input,
      outputTokens: output,
      costMicroUsd: costMicroUsd(model, input, output),
      error: error ? String(error instanceof Error ? error.message : error).slice(0, 500) : null,
    },
  });
}
