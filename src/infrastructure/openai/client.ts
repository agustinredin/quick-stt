import OpenAI from "openai";
import { assertEnv, env } from "@/config/env";

export function createOpenAIClient(): OpenAI {
  assertEnv();
  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
}
