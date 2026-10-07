const SKIN = ["#e6c2a6", "#c9956e", "#8d5a3c", "#f0d2bf", "#a9744f"];
const HAIR = ["#1b1a17", "#3a2a22", "#6b5344", "#d9d3c7", "#8a3030", "#1e3348"];
const INK = "#14181f";

function hashName(name: string): number {
  let h = 2166136261;
  for (const ch of name) {
    h ^= ch.codePointAt(0) ?? 0;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry(seed: number) {
  let s = seed || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Deterministic stylized portrait. Same name always yields the same JPEG. No text. */
export function makePortrait(name: string, team: "flare" | "steel"): string {
  const rng = mulberry(hashName(name));
  const canvas = document.createElement("canvas");
  canvas.width = 240;
  canvas.height = 320;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = team === "flare" ? "#2a1614" : "#141c28";
  ctx.fillRect(0, 0, 240, 320);
  ctx.fillStyle = team === "flare" ? "#3a201c" : "#1c2838";
  ctx.beginPath();
  ctx.arc(40 + rng() * 160, 36, 70 + rng() * 30, 0, Math.PI * 2);
  ctx.fill();

  const skin = SKIN[Math.floor(rng() * SKIN.length)] ?? SKIN[0];
  const hair = HAIR[Math.floor(rng() * HAIR.length)] ?? HAIR[0];
  const faceW = 52 + rng() * 22;
  const faceH = 64 + rng() * 18;

  ctx.fillStyle = team === "flare" ? "#6e342c" : "#2c4660";
  ctx.fillRect(58, 196, 124, 124);
  ctx.fillStyle = skin;
  ctx.fillRect(78, 214, 28, 70);
  ctx.fillRect(134, 214, 28, 70);

  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.ellipse(120, 132, faceW + 8, 28 + rng() * 16, 0, Math.PI, 0);
  ctx.fill();

  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(120, 148, faceW, faceH, 0, 0, Math.PI * 2);
  ctx.fill();

  const glasses = rng() > 0.55;
  ctx.fillStyle = INK;
  const eyeY = 142 + rng() * 8;
  const spread = 16 + rng() * 8;
  if (glasses) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.strokeRect(120 - spread - 16, eyeY - 8, 28, 16);
    ctx.strokeRect(120 + spread - 12, eyeY - 8, 28, 16);
    ctx.beginPath();
    ctx.moveTo(120 - spread + 12, eyeY);
    ctx.lineTo(120 + spread - 12, eyeY);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(120 - spread, eyeY, 3.2, 0, Math.PI * 2);
    ctx.arc(120 + spread, eyeY, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  if (rng() > 0.62) {
    ctx.fillRect(120 - 10, 168, 20, 8);
  }

  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(120, 176, 8 + rng() * 6, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  if (rng() > 0.7) {
    ctx.fillStyle = hair;
    ctx.fillRect(120 - faceW, 120, 14, 90);
    ctx.fillRect(120 + faceW - 14, 120, 14, 90);
  }

  return canvas.toDataURL("image/jpeg", 0.72);
}

/** A frame that is not any enrolled character. */
export function makeStrangerJpeg(): string {
  const canvas = document.createElement("canvas");
  canvas.width = 240;
  canvas.height = 320;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = "#10140f";
  ctx.fillRect(0, 0, 240, 320);
  ctx.strokeStyle = "#6d7a55";
  ctx.lineWidth = 8;
  for (let i = -320; i < 240; i += 28) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 320, 320);
    ctx.stroke();
  }
  ctx.fillStyle = "#c7d3a4";
  ctx.beginPath();
  ctx.arc(120, 160, 36, 0, Math.PI * 2);
  ctx.fill();
  return canvas.toDataURL("image/jpeg", 0.72);
}
