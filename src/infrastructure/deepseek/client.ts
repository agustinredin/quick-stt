import OpenAI from "openai";
import { assertEnv, env } from "@/config/env";

export function createDeepSeekClient(): OpenAI {
  assertEnv();
  return new OpenAI({
    apiKey: env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com",
  });
}
