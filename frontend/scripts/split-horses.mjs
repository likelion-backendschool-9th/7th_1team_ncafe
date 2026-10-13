// 말 에셋 시트(말에셋.png, 1536×1024 · 4열 × 3줄 · 조끼 번호 1~12)를 출전마 이미지로 자른다.
//   node scripts/split-horses.mjs [시트 경로=assets/horse-sheet.png]
// 결과: public/images/horses/<이름>.png — 모두 같은 크기(CANVAS) 투명 PNG, 말은 가운데 · 바닥 맞춤.
// sharp 는 Next.js 가 함께 설치하는 패키지를 쓴다(개발용 스크립트라 의존성에 따로 넣지 않았다).
//
// 시트 정리: 배경을 지운 흔적인 옅은 픽셀(알파 < ALPHA_CUT)은 지우고, 거의 불투명한 픽셀(알파 ≥ ALPHA_SOLID)은
// 완전히 불투명하게 만든다(원본은 알파 최대값이 254 라 말 본체가 살짝 비친다). 그 사이는 가장자리라 비율대로 늘린다.
// 그래도 남는 작은 점(말과 떨어진 MIN_BLOB 픽셀 미만 덩어리)은 지운다.
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SHEET = process.argv[2] ?? "assets/horse-sheet.png";
const OUT_DIR = "public/images/horses";
const CANVAS = { width: 420, height: 300 };
const PAD = 8;
const ALPHA_CUT = 40;
const ALPHA_SOLID = 192;
/** 이보다 작은 떨어진 픽셀 덩어리는 배경 잔여물로 보고 지운다(흙먼지 덩어리는 수백 픽셀 이상) */
const MIN_BLOB = 40;

/** 시트 안 칸 — 조끼 번호 → 불투명 픽셀 경계(알파 ≥ 120 투영으로 잰 값) */
const CELLS = {
  1: { x0: 17, x1: 415, y0: 61, y1: 344 },
  2: { x0: 429, x1: 794, y0: 61, y1: 344 },
  3: { x0: 802, x1: 1171, y0: 61, y1: 344 },
  4: { x0: 1187, x1: 1519, y0: 61, y1: 344 },
  5: { x0: 28, x1: 428, y0: 391, y1: 657 },
  6: { x0: 438, x1: 794, y0: 391, y1: 657 },
  7: { x0: 812, x1: 1155, y0: 391, y1: 657 },
  8: { x0: 1183, x1: 1520, y0: 391, y1: 657 },
  9: { x0: 25, x1: 412, y0: 695, y1: 963 },
  10: { x0: 442, x1: 787, y0: 695, y1: 963 },
  11: { x0: 817, x1: 1161, y0: 695, y1: 963 },
  12: { x0: 1176, x1: 1521, y0: 695, y1: 963 },
};

/** 출전마 → 시트의 조끼 번호(이름에 어울리는 털색으로 골랐다 — 게이트 번호와는 다르다) */
const PICKS = {
  thunder: 3, // 흑마 · 파랑 조끼
  latte: 7, // 크림 · 청록 조끼
  mocha: 1, // 갈색 · 초록 조끼
  espresso: 8, // 짙은 갈색 · 주황 조끼
  caramel: 4, // 금색 · 노랑 조끼
  vanilla: 2, // 흰색 · 분홍 조끼
  cookie: 5, // 밤색 · 빨강 조끼
};

function cleanAlpha(data) {
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i];
    data[i] =
      a < ALPHA_CUT ? 0 : a >= ALPHA_SOLID ? 255 : Math.round(((a - ALPHA_CUT) / (ALPHA_SOLID - ALPHA_CUT)) * 255);
  }
  return data;
}

/** 보이는 픽셀(알파 > 0)을 8방향으로 이어 덩어리를 찾고, MIN_BLOB 보다 작은 덩어리는 투명하게 */
function dropSpecks(data, width, height) {
  const seen = new Uint8Array(width * height);
  const stack = [];
  for (let start = 0; start < width * height; start++) {
    if (seen[start] || data[start * 4 + 3] === 0) continue;
    const blob = [];
    seen[start] = 1;
    stack.push(start);
    while (stack.length) {
      const p = stack.pop();
      blob.push(p);
      const x = p % width;
      const y = (p - x) / width;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const q = ny * width + nx;
          if (!seen[q] && data[q * 4 + 3] > 0) {
            seen[q] = 1;
            stack.push(q);
          }
        }
    }
    if (blob.length < MIN_BLOB) for (const p of blob) data[p * 4 + 3] = 0;
  }
  return data;
}

const meta = await sharp(SHEET).metadata();
await mkdir(OUT_DIR, { recursive: true });

for (const [name, cellNo] of Object.entries(PICKS)) {
  const c = CELLS[cellNo];
  const left = Math.max(0, c.x0 - PAD);
  const top = Math.max(0, c.y0 - PAD);
  const width = Math.min(meta.width, c.x1 + PAD + 1) - left;
  const height = Math.min(meta.height, c.y1 + PAD + 1) - top;
  if (width > CANVAS.width || height > CANVAS.height) throw new Error(`${name}: 칸(${width}×${height})이 캔버스보다 크다`);

  const { data, info } = await sharp(SHEET)
    .extract({ left, top, width, height })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const cleaned = dropSpecks(cleanAlpha(data), info.width, info.height);
  const sprite = await sharp(cleaned, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();

  const file = path.join(OUT_DIR, `${name}.png`);
  await sharp({ create: { ...CANVAS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: sprite, left: Math.round((CANVAS.width - width) / 2), top: CANVAS.height - height }])
    .png({ compressionLevel: 9 })
    .toFile(file);
  console.log(`${file}  ← 시트 ${cellNo}번 (${width}×${height})`);
}
