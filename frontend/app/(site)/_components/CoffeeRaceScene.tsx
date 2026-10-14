"use client";

import { useEffect, useRef } from "react";

/** 원본 일러스트 크기 — 아래 좌표(관중 · 깃발 · 트랙)는 모두 이 좌표계 기준이다 */
const WIDTH = 1774;
const HEIGHT = 887;
const ASSET = "/images/hero/coffee-race";

const HORSES = ["yellow", "red", "orange", "teal", "green", "blue", "pink"].map((c) => `horse-${c}.webp`);

/** 한 바퀴 시간(초). 모든 말이 같은 주기라 간격이 유지된 채 시계 방향으로 끊김 없이 돈다 */
const LAP_SECONDS = 13;
const TWO_PI = Math.PI * 2;

/**
 * 말 발굽이 지나는 경로 — 배경의 흙길 띠 한가운데를 따라가도록 픽셀로 측정해 맞춘 타원.
 * 원근 때문에 뒤쪽 직선(y≈465)이 앞쪽(y≈772)보다 납작해서 위 · 아래 반지름을 따로 둔다.
 */
const TRACK = { cx: 883, cy: 630, rx: 705, ryTop: 165, ryBottom: 142 };

/** 말 크기(가로 px) — 가장 먼 레인 ~ 가장 가까운 레인 */
const HORSE_WIDTH = { far: 90, near: 175 };

/** 캔버스 해상도 상한(원본 대비 배율). 레티나에서도 매 프레임 그리는 픽셀 수를 제한한다 */
const MAX_SCALE = 2;

type CrowdGroup = {
  x: number;
  y: number;
  width: number;
  height: number;
  vertices: [number, number][];
  phase: number;
  intensity: number;
};

// 원본 일러스트의 관중 부분에만 맞춘 마스크. 펜스 · 컵 · 트랙 · 하늘은 포함하지 않는다.
const CROWD: CrowdGroup[] = [
  { x: 0, y: 176, width: 378, height: 140, vertices: [[0, 186], [355, 247], [355, 294], [0, 242]], phase: 0.2, intensity: 5 },
  { x: 0, y: 325, width: 426, height: 90, vertices: [[0, 334], [418, 366], [418, 395], [0, 390]], phase: 1.9, intensity: 4 },
  { x: 1390, y: 335, width: 384, height: 85, vertices: [[1390, 356], [1774, 366], [1774, 406], [1390, 395]], phase: 2.7, intensity: 3 },
  {
    x: 0, y: 704, width: 350, height: 183,
    vertices: [[0, 731], [72, 704], [190, 730], [275, 742], [350, 761], [350, 887], [0, 887]],
    phase: 0, intensity: 8,
  },
  {
    x: 330, y: 706, width: 405, height: 181,
    vertices: [[330, 747], [420, 710], [520, 759], [640, 727], [735, 772], [735, 887], [330, 887]],
    phase: 1.8, intensity: 7,
  },
  {
    x: 740, y: 712, width: 420, height: 175,
    vertices: [[740, 772], [835, 726], [926, 762], [1025, 712], [1160, 746], [1160, 887], [740, 887]],
    phase: 3.2, intensity: 7,
  },
  {
    x: 1160, y: 700, width: 614, height: 187,
    vertices: [[1160, 746], [1250, 729], [1374, 750], [1460, 714], [1612, 707], [1774, 753], [1774, 887], [1160, 887]],
    phase: 4.5, intensity: 8,
  },
];

// 바람은 깃발 천(벡터 오버레이)에만 적용한다. 깃대 · 배경은 그대로다.
const FLAGS = [
  { x: 174, y: 31, w: 61, h: 63, green: true, phase: 0 },
  { x: 311, y: 105, w: 38, h: 50, green: false, phase: 1.2 },
  { x: 414, y: 172, w: 62, h: 57, green: true, phase: 2.0 },
  { x: 597, y: 254, w: 51, h: 44, green: true, phase: 1.3 },
  { x: 1108, y: 301, w: 42, h: 41, green: true, phase: 2.5 },
  { x: 1327, y: 286, w: 54, h: 50, green: true, phase: 0.7 },
  { x: 1476, y: 285, w: 44, h: 49, green: true, phase: 3.4 },
];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`이미지 로딩 실패: ${src}`));
    img.src = src;
  });
}

/** 말 i 의 트랙 위 각도. -π/2(트랙 맨 위)에서 출발해 증가 = 화면 좌표계에서 시계 방향 */
function horseAngle(t: number, i: number) {
  const progress = (t / LAP_SECONDS + i / HORSES.length) % 1;
  return -Math.PI / 2 + TWO_PI * progress;
}

function drawCrowd(ctx: CanvasRenderingContext2D, bg: HTMLImageElement, t: number) {
  for (const c of CROWD) {
    const bounce = Math.sin(t * 4 + c.phase) * c.intensity;
    const sway = Math.sin(t * 2.6 + c.phase) * 1.5;
    ctx.save();
    ctx.beginPath();
    c.vertices.forEach(([x, y], idx) => (idx === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.clip();
    // 마스크 안의 관중 픽셀만 살짝 옮겨 다시 그린다 — 배경 자체는 움직이지 않는다
    ctx.drawImage(bg, c.x, c.y, c.width, c.height, c.x + sway, c.y + bounce, c.width, c.height);
    ctx.restore();
  }
}

function drawFlags(ctx: CanvasRenderingContext2D, t: number) {
  for (const { x, y, w, h, green, phase } of FLAGS) {
    const wave = Math.sin(t * 4.1 + phase) * 6;
    ctx.save();
    ctx.fillStyle = green ? "#246F4B" : "#FFCE64";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + w * 0.3, y - 4 + wave * 0.3, x + w * 0.65, y + 5 - wave, x + w, y + 7 + wave);
    ctx.lineTo(x + w - 3, y + h - 5 + wave);
    ctx.bezierCurveTo(x + w * 0.55, y + h - wave, x + w * 0.25, y + h + wave * 0.5, x, y + h - 4);
    ctx.closePath();
    ctx.fill();
    if (green) {
      // 커피콩 엠블럼
      ctx.translate(x + w * 0.5, y + h * 0.46);
      ctx.rotate(0.14);
      ctx.fillStyle = "#F7F0D7";
      ctx.beginPath();
      ctx.ellipse(0, 0, Math.max(4, w * 0.11), Math.max(7, h * 0.21), 0, 0, TWO_PI);
      ctx.fill();
      ctx.strokeStyle = "#246F4B";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(3, -h * 0.15);
      ctx.quadraticCurveTo(-3, 0, 2, h * 0.14);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawHorse(ctx: CanvasRenderingContext2D, horse: HTMLImageElement, t: number, i: number) {
  const angle = horseAngle(t, i);
  const ry = Math.sin(angle) < 0 ? TRACK.ryTop : TRACK.ryBottom;
  const x = TRACK.cx + TRACK.rx * Math.cos(angle);
  const y = TRACK.cy + ry * Math.sin(angle);
  // 앞쪽(화면 아래) 레인일수록 크게 — 원근감
  const near = (Math.sin(angle) + 1) / 2;
  const width = HORSE_WIDTH.far + (HORSE_WIDTH.near - HORSE_WIDTH.far) * near;
  const height = width * (horse.naturalHeight / horse.naturalWidth);
  const vx = -TRACK.rx * Math.sin(angle);
  const vy = ry * Math.cos(angle);
  // 달리는 들썩임은 위로만 — 발이 경로 아래(트랙 밖)로 내려가지 않게 한다
  const bob = -Math.abs(Math.sin(t * 11 + i * 1.8)) * 3;

  ctx.save();
  // 기준점 = 발굽. 기울여도 발이 경로 위에 그대로 남는다
  ctx.translate(x, y + bob);
  // 원본은 오른쪽을 본다 — 왼쪽으로 달리는 구간(앞쪽 레인)에서는 좌우 반전
  if (vx < 0) ctx.scale(-1, 1);
  // 곡선 구간에서만 살짝 기울인다
  const incline = Math.max(-0.18, Math.min(0.18, Math.atan2(vy, Math.abs(vx) + 20) * 0.26));
  ctx.rotate(vx < 0 ? -incline : incline);
  // 말 이미지의 발굽은 맨 아랫줄(높이의 ~99%)에 있다 — 이미지 바닥을 경로에 맞춘다
  ctx.drawImage(horse, -width / 2, -height, width, height);
  ctx.restore();
}

/**
 * NEXT RACE 히어로 배경 — 커피 컵을 둘러싼 트랙을 7마리 말이 시계 방향으로 도는 캔버스 애니메이션.
 * 뒤쪽 레인의 말은 cup-front 레이어에 가려지고, 관중은 들썩이고, 깃발은 바람에 흔들린다.
 * 같은 일러스트의 정적 이미지가 아래에 깔려 있어 로딩 전 · 실패 시에도 빈 화면이 되지 않는다.
 * 탭이 숨겨지거나 화면 밖으로 스크롤되면 멈추고, prefers-reduced-motion 이면 한 프레임만 그린다.
 */
export default function CoffeeRaceScene({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let disposed = false;
    let raf = 0;
    let running = false;
    let visible = true;
    let elapsed = 0; // 실제로 재생된 시간(초) — 멈췄다 재개해도 말이 순간이동하지 않는다
    let lastMs = 0;
    let assets: HTMLImageElement[] | null = null;

    // 화면에 보이는 크기(object-fit: cover 기준)에 맞춰 내부 해상도를 정한다
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const shown = Math.max(canvas.clientWidth, canvas.clientHeight * (WIDTH / HEIGHT));
      const scale = Math.min(MAX_SCALE, Math.max(0.5, (shown * dpr) / WIDTH));
      canvas.width = Math.round(WIDTH * scale);
      canvas.height = Math.round(HEIGHT * scale);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      if (assets && !running) paint(elapsed);
    };

    const paint = (t: number) => {
      if (!assets) return;
      const [background, cupFront, ...horses] = assets;
      ctx.drawImage(background, 0, 0, WIDTH, HEIGHT);
      drawCrowd(ctx, background, t);
      drawFlags(ctx, t);
      // 뒤쪽 레인 말 → 컵 앞면 → 앞쪽 레인 말 순서로 그려 컵 뒤로 지나가게 한다
      const rear: number[] = [];
      const front: number[] = [];
      horses.forEach((_, i) => (Math.sin(horseAngle(t, i)) < 0 ? rear : front).push(i));
      rear.forEach((i) => drawHorse(ctx, horses[i], t, i));
      ctx.drawImage(cupFront, 0, 0, WIDTH, HEIGHT);
      front.forEach((i) => drawHorse(ctx, horses[i], t, i));
    };

    const frame = (ms: number) => {
      if (!running) return;
      // 탭 전환 등으로 프레임이 크게 밀리면 한 프레임분만 진행한다
      if (lastMs) elapsed += Math.min(ms - lastMs, 100) / 1000;
      lastMs = ms;
      paint(elapsed);
      raf = requestAnimationFrame(frame);
    };

    const sync = () => {
      const shouldRun = !!assets && !reduceMotion && visible && !document.hidden;
      if (shouldRun === running) return;
      running = shouldRun;
      if (running) {
        lastMs = 0;
        raf = requestAnimationFrame(frame);
      } else {
        cancelAnimationFrame(raf);
      }
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    intersectionObserver.observe(canvas);
    document.addEventListener("visibilitychange", sync);

    Promise.all([
      loadImage(`${ASSET}/background.jpg`),
      loadImage(`${ASSET}/cup-front.webp`),
      ...HORSES.map((name) => loadImage(`${ASSET}/${name}`)),
    ])
      .then((images) => {
        if (disposed) return;
        assets = images;
        paint(elapsed);
        canvas.dataset.ready = "true"; // 첫 프레임을 그린 뒤에 정적 이미지 위로 페이드인
        sync();
      })
      .catch((error) => console.error("CoffeeRaceScene:", error));

    return () => {
      disposed = true;
      running = false;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} width={WIDTH} height={HEIGHT} aria-hidden />;
}
