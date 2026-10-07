import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { DEFAULT_AI, MODEL_PRESETS, readAiSettings, writeAiSettings, type AiSettings } from "@/lib/game/ai-settings";

export function AiFields() {
  const [ai, setAi] = useState<AiSettings>(DEFAULT_AI);

  useEffect(() => {
    setAi(readAiSettings());
  }, []);

  function update(patch: Partial<AiSettings>) {
    const next = { ...ai, ...patch };
    setAi(next);
    writeAiSettings(next);
  }

  return (
    <div className="mt-4 grid gap-2">
      <label className="text-xs tracking-wide text-subtle">Base URL</label>
      <Input
        className="h-9"
        value={ai.baseUrl}
        spellCheck={false}
        placeholder="https://api.openai.com/v1"
        onChange={(e) => update({ baseUrl: e.target.value })}
      />
      <label className="text-xs tracking-wide text-subtle">模型</label>
      <Input
        className="h-9"
        list="sk-models"
        value={ai.model}
        spellCheck={false}
        placeholder="gpt-4.1-mini"
        onChange={(e) => update({ model: e.target.value })}
      />
      <datalist id="sk-models">
        {MODEL_PRESETS.map((model) => (
          <option key={model} value={model} />
        ))}
      </datalist>
      <label className="text-xs tracking-wide text-subtle">API Key</label>
      <Input
        className="h-9"
        type="password"
        autoComplete="off"
        value={ai.apiKey}
        placeholder="sk-…"
        onChange={(e) => update({ apiKey: e.target.value })}
      />
      <p className="text-xs leading-relaxed text-subtle">
        走 OpenAI Responses 格式。Key 只留在这台浏览器，开枪时才提交，不会写进对局。
      </p>
    </div>
  );
}
