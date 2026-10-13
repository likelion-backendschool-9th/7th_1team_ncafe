// 경기 화면(PixiJS v8, WebGL) — React 와 무관한 장면 클래스(사용자 결정 2026-10-13: 경기 화면만 캔버스, 머리띠 · HUD · 토스트는 DOM).
// HorseTrack 이 effect 에서 create 로 만들고, useRaceRun 의 rAF 루프가 매 프레임 update 로 진행도를 넘기며, 숨겨지거나 떠나면 destroy.
// 레퍼런스(아케이드 경마): 선두를 따라가는 카메라 · 뒤로 흐르는 잔디와 흰 울타리 · 원근으로 겹치는 7마리 · 번호 배지.
// 모든 치수는 캔버스 폭(W) · 높이(H) 의 비율이라 PC · 모바일에서 같은 구도가 나온다.
// pixi.js 는 /race 에서만 쓰므로 동적 import 로 불러 다른 페이지 번들에 섞이지 않게 한다.
import type { Application, Container, Graphics, Sprite, Text, Texture, TilingSprite } from "pixi.js";

type Pixi = typeof import("pixi.js");

export interface SceneHorse {
  id: number;
  image: string;
  color: string; // 번호 배지 바탕(대표색)
  textColor: string; // 배지 글자색(textOn)
  mine: boolean;
}

export interface SceneFrame {
  leader: number; // 선두 진행도 0~1 — 카메라
  runners: { horseId: number; progress: number; finishedAt: number | null }[]; // 게이트 번호 순(= 원근 줄)
  running: boolean; // 달리는 중(들썩임 · 먼지)
}

/**
 * 카메라 — 트랙 전체 길이는 화면 폭의 COURSE %. 선두는 화면의 ANCHOR_RUN % 지점에 고정되고 나머지는 그 뒤에서 엎치락뒤치락.
 * 출발 직후에는 말들이 왼쪽(ANCHOR_START)에서 오른쪽으로 옮겨 가며 카메라가 붙는 느낌을 낸다.
 * 선두가 결승을 지나면 leader 가 1 에 묶여 카메라가 결승선에 멈추고 나머지가 들어온다.
 * COURSE 는 시뮬레이션의 선두 ↔ 꼴찌 간격(p90 ≈ 0.21)이 화면 안에 들어오도록 잡았다.
 */
export const COURSE = 260;
const ANCHOR_START = 24;
const ANCHOR_RUN = 66;
const ANCHOR_EASE = 0.12;

/** 카메라 x(화면 폭 %) — 화면 x = 트랙 x − 카메라 x */
export function cameraFor(leader: number): number {
  const t = Math.min(1, Math.max(0, leader) / ANCHOR_EASE);
  const eased = t * t * (3 - 2 * t);
  return Math.min(1, leader) * COURSE - (ANCHOR_START + (ANCHOR_RUN - ANCHOR_START) * eased);
}

/** 원근 7줄 — 맨 뒤(0, 바깥 울타리 쪽)부터 맨 앞(6). 발이 닿는 높이(H 비율)와 크기 배율 */
const ROW_TOP = 0.32;
const ROW_GAP = 0.095;
const SCALE_FAR = 0.66;
/** 말 폭(W 비율) — 좁은 화면에서는 더 크게 */
const horseWidth = (w: number) => (w < 600 ? 0.15 : 0.12) * w;
/** 번호 배지 크기 배율 — 좁은 화면에서는 조금 작게(출발선에 7마리가 겹칠 때 배지끼리 가리지 않게) */
const badgeScale = (w: number) => (w < 600 ? 0.78 : 1);
const HORSE_RATIO = 300 / 420; // 이미지 비율(높이/폭)

const HEDGE_H = 0.13;
const RAIL_FAR_Y = 0.11;
const RAIL_FAR_H = 0.07;
const RAIL_NEAR_H = 0.09;
const FINISH_W = 0.024;
const POST_W = 0.012;

const FONT = "Pretendard Variable, Pretendard, -apple-system, system-ui, sans-serif";

interface RunnerView {
  horse: SceneHorse;
  row: number;
  root: Container;
  body: Sprite;
  shadow: Graphics;
  tag: Container;
  w: number; // 현재 말 폭(px, 배율 전)
  h: number;
  lastDust: number;
}

interface Dust {
  g: Graphics;
  vx: number;
  vy: number;
  life: number;
  age: number;
  size: number;
}

export class TrackScene {
  private width = 0;
  private height = 0;
  private frame: SceneFrame | null = null;
  private time = 0;
  private readonly reduceMotion: boolean;
  private readonly textures: Texture[] = [];
  private readonly runners = new Map<number, RunnerView>();
  private readonly dust: Dust[] = [];
  private readonly observer: ResizeObserver;

  private hedge!: TilingSprite;
  private railFar!: TilingSprite;
  private turf!: TilingSprite;
  private shade!: Graphics;
  private startPost!: Container;
  private finishPost!: Container;
  private dustLayer!: Container;
  private runnerLayer!: Container;
  private railNear!: TilingSprite;

  private constructor(
    private readonly pixi: Pixi,
    private readonly app: Application,
    private readonly host: HTMLElement,
    private readonly horses: SceneHorse[],
    private readonly horseTextures: Record<string, Texture>,
  ) {
    this.reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    this.build();
    this.observer = new ResizeObserver(() => this.layout());
    this.observer.observe(host);
    this.layout();
    this.app.ticker.add((ticker) => this.animate(ticker.deltaMS));
  }

  /** WebGL 을 만들 수 없으면(지원 안 함 · 컨텍스트 실패) reject — 호출한 쪽이 안내 문구로 대체한다 */
  static async create(host: HTMLElement, horses: SceneHorse[]): Promise<TrackScene> {
    const pixi = await import("pixi.js");
    const app = new pixi.Application();
    await app.init({
      preference: "webgl",
      background: "#4a9d3f",
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      width: Math.max(1, host.clientWidth),
      height: Math.max(1, host.clientHeight),
    });
    const textures = await pixi.Assets.load<Texture>(horses.map((h) => h.image));
    host.appendChild(app.canvas);
    return new TrackScene(pixi, app, host, horses, textures);
  }

  /** 진행도를 받아 위치 · 카메라를 갱신한다(매 프레임). READY · FINISHED 에서는 한 번만 불려도 된다 */
  update(frame: SceneFrame): void {
    this.frame = frame;
    this.apply();
  }

  destroy(): void {
    this.observer.disconnect();
    this.textures.forEach((t) => t.destroy(true));
    this.app.destroy(true, { children: true });
  }

  // ---------- 장면 구성 ----------

  private build(): void {
    const { Container, Graphics, Sprite, TilingSprite } = this.pixi;
    const stage = this.app.stage;

    this.hedge = new TilingSprite({ texture: this.hedgeTexture() });
    this.railFar = new TilingSprite({ texture: this.railTexture() });
    this.turf = new TilingSprite({ texture: this.turfTexture() });
    this.shade = new Graphics();
    this.startPost = this.post("START", false);
    this.finishPost = this.post("FINISH", true);
    this.dustLayer = new Container();
    this.runnerLayer = new Container();
    this.runnerLayer.sortableChildren = true;
    this.railNear = new TilingSprite({ texture: this.railTexture() });

    stage.addChild(this.hedge, this.railFar, this.turf, this.shade, this.startPost, this.finishPost, this.dustLayer, this.runnerLayer, this.railNear);

    this.horses.forEach((horse, row) => {
      const root = new Container();
      root.zIndex = row;
      const shadow = new Graphics();
      const body = new Sprite(this.horseTextures[horse.image]);
      body.anchor.set(0.5, 1);
      const tag = this.badge(horse);
      root.addChild(shadow, body, tag);
      this.runnerLayer.addChild(root);
      this.runners.set(horse.id, { horse, row, root, body, shadow, tag, w: 0, h: 0, lastDust: 0 });
    });
  }

  /** 게이트 번호 배지(대표색 원 + 번호) — 내 말은 위에 MY 표식 */
  private badge(horse: SceneHorse): Container {
    const { Container, Graphics, Text } = this.pixi;
    const tag = new Container();
    const circle = new Graphics().circle(0, 0, 13).fill(horse.color).circle(0, 0, 13).stroke({ width: 2, color: 0xffffff, alpha: 0.6 });
    const num = new Text({
      text: String(horse.id),
      style: { fontFamily: FONT, fontSize: 15, fontWeight: "800", fill: horse.textColor },
      resolution: 2,
    });
    num.anchor.set(0.5, 0.5);
    num.y = 1;
    tag.addChild(circle, num);
    if (horse.mine) {
      const my = new Container();
      const plate = new Graphics().roundRect(-16, -9, 32, 18, 4).fill("#c9a227");
      const label = new Text({ text: "MY", style: { fontFamily: FONT, fontSize: 10, fontWeight: "800", fill: "#141416", letterSpacing: 1 }, resolution: 2 });
      label.anchor.set(0.5, 0.5);
      const pin = new Graphics().poly([-4, 9, 4, 9, 0, 14]).fill("#c9a227");
      my.addChild(plate, label, pin);
      my.y = -30;
      tag.addChild(my);
    }
    return tag;
  }

  /** 출발 · 결승 기둥 — 울타리 사이 세로 기둥(결승은 체크무늬 띠) + 위쪽 표지판 */
  private post(label: string, checkered: boolean): Container {
    const { Container, Graphics, Text } = this.pixi;
    const root = new Container();
    const bar = new Graphics();
    bar.label = checkered ? "finish" : "start";
    const signBg = new Graphics();
    signBg.label = "signBg";
    const sign = new Text({ text: label, style: { fontFamily: FONT, fontSize: 11, fontWeight: "800", fill: "#ffffff", letterSpacing: 2 }, resolution: 2 });
    sign.label = "sign";
    sign.anchor.set(0.5, 0.5);
    root.addChild(bar, signBg, sign);
    return root;
  }

  // ---------- 크기 · 배치 ----------

  /** 캔버스 크기가 바뀌면(ResizeObserver) 모든 층을 다시 재고 마지막 프레임을 다시 그린다 */
  private layout(): void {
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    if (w === 0 || h === 0) return;
    if (w !== this.width || h !== this.height) this.app.renderer.resize(w, h);
    this.width = w;
    this.height = h;

    // 배경 층 — 타일 폭은 화면 비율로(잔디 줄 한 쌍 = 16% · 울타리 기둥 간격 = 8%)
    this.hedge.setSize(w, h * HEDGE_H);
    this.hedge.tileScale.set((0.11 * w) / 128, (h * HEDGE_H) / 64);
    this.railFar.position.set(0, h * RAIL_FAR_Y);
    this.railFar.setSize(w, h * RAIL_FAR_H);
    this.railFar.tileScale.set((0.08 * w) / 128, (h * RAIL_FAR_H) / 32);
    this.turf.position.set(0, h * HEDGE_H);
    this.turf.setSize(w, h * (1 - HEDGE_H));
    this.turf.tileScale.set((0.16 * w) / 256, (h * (1 - HEDGE_H)) / 64);
    this.railNear.position.set(0, h * (1 - RAIL_NEAR_H));
    this.railNear.setSize(w, h * RAIL_NEAR_H);
    this.railNear.tileScale.set((0.12 * w) / 128, (h * RAIL_NEAR_H) / 32);

    // 먼 쪽이 어두운 원근 그늘
    this.shade.clear();
    const shadeTop = h * HEDGE_H;
    const shadeH = h * 0.45;
    const steps = 8;
    for (let i = 0; i < steps; i++) {
      const alpha = 0.2 * (1 - i / steps);
      this.shade.rect(0, shadeTop + (shadeH * i) / steps, w, shadeH / steps + 1).fill({ color: 0x000000, alpha });
    }

    this.layoutPost(this.startPost, false);
    this.layoutPost(this.finishPost, true);

    // 말 — 줄마다 크기 배율, 배지는 배율과 무관하게 같은 크기
    const baseW = horseWidth(w);
    const badge = badgeScale(w);
    this.runners.forEach((r) => {
      const s = SCALE_FAR + ((1 - SCALE_FAR) * r.row) / 6;
      r.w = baseW;
      r.h = baseW * HORSE_RATIO;
      r.root.scale.set(s);
      r.body.width = baseW;
      r.body.height = r.h;
      r.body.x = -baseW / 2;
      r.shadow.clear().ellipse(-baseW * 0.5, 0, baseW * 0.42, baseW * 0.06).fill({ color: 0x000000, alpha: 0.22 });
      r.tag.position.set(-baseW / 2, -r.h - 8 / s);
      r.tag.scale.set(badge / s);
    });

    this.apply();
  }

  private layoutPost(root: Container, checkered: boolean): void {
    const { width: w, height: h } = this;
    const top = h * (RAIL_FAR_Y + RAIL_FAR_H * 0.5);
    const bottom = h * (1 - RAIL_NEAR_H * 0.6);
    const bar = root.getChildByLabel(checkered ? "finish" : "start") as Graphics;
    bar.clear();
    if (checkered) {
      const bw = w * FINISH_W;
      const cell = bw / 2;
      const rows = Math.ceil((bottom - top) / cell);
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < 2; j++) {
          const dark = (i + j) % 2 === 0;
          bar.rect(j * cell, top + i * cell, cell, Math.min(cell, bottom - top - i * cell)).fill(dark ? 0x141416 : 0xf4f4f5);
        }
      }
    } else {
      bar.rect(0, top, w * POST_W, bottom - top).fill(0xf4f4f5);
      bar.rect(0, top, w * POST_W, 4).fill(0xc6382c);
    }
    // 표지판은 기둥 오른쪽에(출발선에 선 말들의 MY 표식과 겹치지 않게)
    const sign = root.getChildByLabel("sign") as Text;
    const signBg = root.getChildByLabel("signBg") as Graphics;
    const cx = (checkered ? w * FINISH_W : w * POST_W) + sign.width / 2 + 12;
    const cy = h * 0.055;
    sign.position.set(cx, cy);
    signBg.clear().roundRect(cx - sign.width / 2 - 8, cy - 10, sign.width + 16, 20, 3).fill(0x141416);
  }

  /** 마지막 프레임을 현재 크기에 맞춰 배치 */
  private apply(): void {
    const { width: w, height: h, frame } = this;
    if (!frame || w === 0) return;
    const cam = (cameraFor(frame.leader) / 100) * w;
    this.turf.tilePosition.x = -cam;
    this.railFar.tilePosition.x = -cam * 0.75;
    this.hedge.tilePosition.x = -cam * 0.5;
    this.railNear.tilePosition.x = -cam * 1.25;
    this.startPost.x = -cam;
    this.finishPost.x = (COURSE / 100) * w - cam;
    frame.runners.forEach((runner) => {
      const view = this.runners.get(runner.horseId);
      if (!view) return;
      view.root.position.set(((runner.progress * COURSE) / 100) * w - cam, h * (ROW_TOP + ROW_GAP * view.row));
    });
  }

  // ---------- 장식 애니메이션(Pixi ticker) — 들썩임 · 먼지 ----------

  private animate(deltaMS: number): void {
    this.time += deltaMS;
    const running = !!this.frame?.running && !this.reduceMotion;
    const t = this.time / 1000;
    this.runners.forEach((r) => {
      const runner = this.frame?.runners.find((x) => x.horseId === r.horse.id);
      const onScreen = r.root.x > -r.w && r.root.x < this.width + r.w;
      const moving = running && !!runner && runner.progress < 1.6 && onScreen;
      if (moving) {
        const phase = t * Math.PI * 2 * 2.4 + r.row * 0.9;
        r.body.y = -Math.abs(Math.sin(phase)) * r.h * 0.07;
        r.body.rotation = Math.sin(phase) * 0.035;
        if (this.time - r.lastDust > 110 && runner.progress > 0.01) {
          r.lastDust = this.time;
          this.puff(r);
        }
      } else {
        r.body.y = 0;
        r.body.rotation = 0;
      }
    });
    this.tickDust(deltaMS);
  }

  private puff(r: RunnerView): void {
    const s = r.root.scale.x;
    const g = new this.pixi.Graphics();
    const size = (2.5 + Math.random() * 3) * s;
    g.circle(0, 0, size).fill({ color: 0xefe4cc, alpha: 0.55 });
    g.position.set(r.root.x - r.w * s * 0.92, r.root.y - 2 * s);
    this.dustLayer.addChild(g);
    this.dust.push({ g, vx: -(50 + Math.random() * 60) * s, vy: -(12 + Math.random() * 20) * s, life: 400 + Math.random() * 250, age: 0, size });
  }

  private tickDust(deltaMS: number): void {
    for (let i = this.dust.length - 1; i >= 0; i--) {
      const d = this.dust[i];
      d.age += deltaMS;
      if (d.age >= d.life) {
        d.g.destroy();
        this.dust.splice(i, 1);
        continue;
      }
      const k = d.age / d.life;
      d.g.x += (d.vx * deltaMS) / 1000;
      d.g.y += (d.vy * deltaMS) / 1000;
      d.g.alpha = 0.55 * (1 - k);
      d.g.scale.set(1 + k * 0.9);
    }
  }

  // ---------- 타일 텍스처(2D 캔버스로 그려 Texture.from) — 배경 이미지 에셋을 받으면 이 세 함수만 바꾼다 ----------

  private fromCanvas(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): Texture {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    draw(canvas.getContext("2d")!);
    const texture = this.pixi.Texture.from(canvas);
    this.textures.push(texture);
    return texture;
  }

  /** 잔디 — 깎은 줄무늬 두 띠 + 잔디결 */
  private turfTexture(): Texture {
    return this.fromCanvas(256, 64, (ctx) => {
      ctx.fillStyle = "#4b9e3f";
      ctx.fillRect(0, 0, 128, 64);
      ctx.fillStyle = "#56ab49";
      ctx.fillRect(128, 0, 128, 64);
      for (let i = 0; i < 140; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 64;
        ctx.fillStyle = i % 3 === 0 ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";
        ctx.fillRect(x, y, 1.5, 3);
      }
    });
  }

  /** 바깥 생울타리 — 짙은 초록 바탕에 둥근 덤불 */
  private hedgeTexture(): Texture {
    return this.fromCanvas(128, 64, (ctx) => {
      ctx.fillStyle = "#1e4b20";
      ctx.fillRect(0, 0, 128, 64);
      const bushes = [
        [12, 58, 22, "#27612a"],
        [40, 62, 26, "#2c6b2f"],
        [70, 56, 20, "#245a27"],
        [100, 60, 24, "#2a662d"],
        [124, 58, 18, "#27612a"],
      ] as const;
      for (const [x, y, r, color] of bushes) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(0, 0, 128, 10);
    });
  }

  /** 흰 울타리 — 기둥 하나 + 가로대 둘(타일이 반복되며 기둥이 이어진다) */
  private railTexture(): Texture {
    return this.fromCanvas(128, 32, (ctx) => {
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(0, 9, 128, 6);
      ctx.fillRect(0, 21, 128, 6);
      ctx.fillStyle = "#f4f4f5";
      ctx.fillRect(0, 7, 128, 5);
      ctx.fillRect(0, 19, 128, 5);
      ctx.fillRect(0, 0, 9, 32);
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.fillRect(6, 0, 3, 32);
    });
  }
}
