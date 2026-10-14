"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState, type CSSProperties } from "react";
import type { HeroSlide } from "../_types";
import CoffeeRaceScene from "./CoffeeRaceScene";
import HeroRaceClock, { HeroRaceTabTitle } from "./HeroRaceClock";
import styles from "./hero.module.css";

/** 슬라이드 자동 전환 간격(ms). 활성 탭의 진행바 애니메이션 길이로도 쓰인다(CSS 변수 --autoplay). */
const AUTOPLAY_MS = 5000;

interface HeroProps {
  slides: HeroSlide[];
}

/**
 * 메인 히어로 — 전폭 배너 + 하단에 겹치는 탭형 페이지네이션.
 * 슬라이드가 2장 이상일 때만 자동 전환·이전/다음 버튼·진행바가 동작한다. 호버·포커스 중에는 멈춘다.
 */
export default function Hero({ slides }: HeroProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const baseId = useId();
  const count = slides.length;
  const autoplay = count > 1 && !paused;

  useEffect(() => {
    if (!autoplay) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // index 를 의존성에 넣어 수동 선택 후에도 간격이 처음부터 다시 시작되게 한다(진행바와 동기).
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [autoplay, count, index]);

  if (count === 0) return null;

  const go = (next: number) => setIndex(((next % count) + count) % count);
  const slideId = (i: number) => `${baseId}-slide-${i}`;

  return (
    <section
      className={styles.hero}
      aria-roledescription="carousel"
      aria-label="메인 배너"
      style={{ "--autoplay": `${AUTOPLAY_MS}ms` } as CSSProperties}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className={styles.viewport}>
        {slides.map((slide, i) => {
          const active = i === index;
          const Heading = i === 0 ? "h1" : "h2";
          return (
            <article
              key={slide.id}
              id={slideId(i)}
              className={`${styles.slide} ${active ? styles.slideActive : ""}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${count}`}
              aria-hidden={!active}
              inert={!active}
            >
              <Image
                src={slide.image}
                alt={slide.imageAlt}
                fill
                priority={i === 0}
                sizes="100vw"
                placeholder="blur"
                className={styles.photo}
                style={{ objectPosition: slide.imagePosition ?? "center" }}
              />
              {slide.scene === "coffee-race" && (
                <div className={styles.scene} style={{ "--scene-position": slide.imagePosition ?? "center" } as CSSProperties}>
                  <CoffeeRaceScene className={`${styles.photo} ${styles.sceneCanvas}`} />
                </div>
              )}
              <div className={`${styles.shade} ${slide.scene ? styles.shadeLight : ""}`} aria-hidden />

              <div className={`container ${styles.content}`}>
                <div className={styles.text}>
                  <span className={styles.eyebrow}>{slide.eyebrow}</span>
                  <Heading className={styles.title}>{slide.title}</Heading>
                  {slide.raceClock ? (
                    <HeroRaceClock fallback={slide.headline} />
                  ) : (
                    <p className={styles.headline}>{slide.headline}</p>
                  )}
                  <p className={styles.description}>{slide.description}</p>
                  <div className={styles.actions}>
                    {slide.cta && (
                      <Link href={slide.cta.href} className={`btn ${styles.cta}`}>
                        {slide.cta.label}
                      </Link>
                    )}
                    {slide.status && <span className={styles.status}>{slide.status}</span>}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            className={`${styles.arrow} ${styles.arrowPrev}`}
            aria-label="이전 배너"
            onClick={() => go(index - 1)}
          >
            <Chevron direction="left" />
          </button>
          <button
            type="button"
            className={`${styles.arrow} ${styles.arrowNext}`}
            aria-label="다음 배너"
            onClick={() => go(index + 1)}
          >
            <Chevron direction="right" />
          </button>
        </>
      )}

      <div className={styles.tabs}>
        <div className={`container ${styles.tabsInner}`} role="tablist" aria-label="배너 선택">
          {slides.map((slide, i) => {
            const active = i === index;
            return (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={slideId(i)}
                tabIndex={active ? 0 : -1}
                className={`${styles.tab} ${active ? styles.tabActive : ""}`}
                onClick={() => go(i)}
              >
                <small>{slide.tab.label}</small>
                <strong>
                  {slide.raceClock ? <HeroRaceTabTitle fallback={slide.tab.title} /> : slide.tab.title}
                </strong>
                {/* key 로 리마운트해 탭이 바뀔 때마다 진행바가 0부터 다시 채워진다 */}
                {active && autoplay && <span key={index} className={styles.progress} aria-hidden />}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      aria-hidden
      style={{ transform: direction === "left" ? "scaleX(-1)" : undefined }}
    >
      <path d="M6.5 3.5 L12 9 L6.5 14.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
