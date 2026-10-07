export type AiSettings = {
  baseUrl: string;
  model: string;
  apiKey: string;
};

export const MODEL_PRESETS = ["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini", "gpt-4o"] as const;

export const DEFAULT_AI: AiSettings = {
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4.1-mini",
  apiKey: "",
};

const KEY = "shutter-kill-ai";

export function readAiSettings(): AiSettings {
  if (typeof window === "undefined") return DEFAULT_AI;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_AI;
    const parsed = JSON.parse(raw) as Partial<AiSettings>;
    return {
      baseUrl: typeof parsed.baseUrl === "string" && parsed.baseUrl.trim() ? parsed.baseUrl : DEFAULT_AI.baseUrl,
      model: typeof parsed.model === "string" && parsed.model.trim() ? parsed.model : DEFAULT_AI.model,
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
    };
  } catch {
    return DEFAULT_AI;
  }
}

export function writeAiSettings(settings: AiSettings) {
  localStorage.setItem(KEY, JSON.stringify(settings));
}
