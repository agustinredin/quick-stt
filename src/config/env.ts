export const env = {
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || "",
};

export function assertEnv() {
  if (!env.DEEPSEEK_API_KEY) {
    throw new Error("Missing DEEPSEEK_API_KEY in environment");
  }
}
