export type AiConfig = {
  baseUrl: string;
  model: string;
  apiKey: string;
};

export type VisionHit = {
  matched: boolean;
  name: string;
  confidence: number;
  note: string;
};

const SCHEMA = {
  type: "object",
  properties: {
    matched: { type: "boolean" },
    name: { type: "string" },
    confidence: { type: "number" },
    note: { type: "string" },
  },
  required: ["matched", "name", "confidence", "note"],
  additionalProperties: false,
} as const;

export function responsesEndpoint(raw: string): string {
  let base = raw.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(base)) throw new Error("Base URL 需要以 http:// 或 https:// 开头");
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    throw new Error("Base URL 不正确");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Base URL 不正确");
  if (url.pathname.endsWith("/responses")) return url.toString().replace(/\/+$/, "");
  if (url.pathname === "" || url.pathname === "/") url.pathname = "/v1";
  const path = url.pathname.replace(/\/+$/, "");
  url.pathname = `${path}/responses`;
  return url.toString();
}

function promptFor(names: string[]): string {
  const labels = names.map((name, i) => `${i + 1}. ${name}`).join("\n");
  return [
    "你在做拍照淘汰游戏的人脸核对。第一张图是刚拍的照片。后面每一张图是已登记的正脸，顺序和下面的名单一致。",
    labels,
    "判断新照片里的人是不是名单中的某一个。只有确信是同一个人时 matched 才为 true，name 必须是名单里的原文。对不上、看不清、或是卡通/风景时 matched 为 false，name 为空字符串。",
    "confidence 是 0 到 1。note 用一句中文。只返回 JSON。",
  ].join("\n");
}

function imagePart(dataUrl: string) {
  return { type: "input_image" as const, image_url: dataUrl, detail: "low" as const };
}

function extractText(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const record = body as {
    output_text?: unknown;
    output?: { type?: string; content?: { type?: string; text?: string }[] }[];
  };
  if (typeof record.output_text === "string" && record.output_text.trim()) return record.output_text;
  const chunks: string[] = [];
  for (const item of record.output ?? []) {
    if (item.type !== "message") continue;
    for (const part of item.content ?? []) {
      if (part.text) chunks.push(part.text);
    }
  }
  return chunks.join("\n");
}

function parseHit(raw: string, allowed: Set<string>): VisionHit {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) {
    return { matched: false, name: "", confidence: 0, note: "接口没有返回可识别的结果" };
  }
  let value: { matched?: unknown; name?: unknown; confidence?: unknown; note?: unknown };
  try {
    value = JSON.parse(raw.slice(start, end + 1)) as typeof value;
  } catch {
    return { matched: false, name: "", confidence: 0, note: "接口结果不是 JSON" };
  }
  const name = typeof value.name === "string" ? value.name.trim() : "";
  let confidence = typeof value.confidence === "number" ? value.confidence : 0;
  if (confidence > 1 && confidence <= 100) confidence /= 100;
  confidence = Math.max(0, Math.min(1, confidence));
  const note = typeof value.note === "string" && value.note.trim() ? value.note.trim() : "没有对上已登记的脸";
  const matched = value.matched === true && allowed.has(name) && confidence >= 0.55;
  return { matched, name: matched ? name : "", confidence, note };
}

function upstreamMessage(status: number, body: string): string {
  let detail = "";
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    detail = parsed.error?.message?.slice(0, 140) ?? "";
  } catch {
    detail = "";
  }
  if (status === 401 || status === 403) return "API Key 被拒绝";
  if (status === 404) return "这个 Base URL 没有 Responses 接口";
  if (status === 429) return "接口繁忙，稍后再开一枪";
  return detail ? `识别接口失败：${detail}` : `识别接口失败（${status}）`;
}

async function postResponses(url: string, apiKey: string, payload: unknown): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    throw new Error("连不上这个 Base URL");
  }
  const text = await response.text();
  if (!response.ok) {
    const err = new Error(upstreamMessage(response.status, text));
    (err as Error & { status?: number }).status = response.status;
    throw err;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("识别接口没有返回 JSON");
  }
}

export async function matchPortraits(
  shot: string,
  gallery: { name: string; portrait: string }[],
  ai: AiConfig,
): Promise<VisionHit> {
  const names = gallery.map((row) => row.name);
  const allowed = new Set(names);
  const content = [
    { type: "input_text" as const, text: promptFor(names) },
    imagePart(shot),
    ...gallery.map((row) => imagePart(row.portrait)),
  ];
  const input = [{ role: "user" as const, content }];
  const url = responsesEndpoint(ai.baseUrl);
  const basePayload = { model: ai.model.trim(), input };
  let body: unknown;
  try {
    body = await postResponses(url, ai.apiKey, {
      ...basePayload,
      text: { format: { type: "json_schema", name: "face_match", strict: true, schema: SCHEMA } },
    });
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status !== 400) throw err;
    body = await postResponses(url, ai.apiKey, basePayload);
  }
  return parseHit(extractText(body), allowed);
}
