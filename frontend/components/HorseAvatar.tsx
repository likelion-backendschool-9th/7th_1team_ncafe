import styles from "./ui.module.css";

interface HorseAvatarProps {
  color: string;
  number: number;
  /** 마스코트 소품 이모지(컵·쿠키 등) */
  emblem?: string;
  /** 가로 크기(px) */
  size?: number;
  /** 달리는 중 — 몸 흔들림·다리 애니메이션 */
  running?: boolean;
  className?: string;
}

/**
 * 귀여운 2–3등신 말 마스코트(오른쪽을 본다). 몸통 색은 color, 갈기·꼬리는 color 를 어둡게 섞어 쓴다.
 * 메인 Hero 와 /race 가 함께 쓰므로 공용 components/ 에 둔다.
 */
export default function HorseAvatar({ color, number, emblem, size = 96, running = false, className }: HorseAvatarProps) {
  const dark = `color-mix(in srgb, ${color} 55%, #2b1d12)`;
  const light = `color-mix(in srgb, ${color} 35%, #fbf6ea)`;
  const line = "#2b1d12";

  return (
    <span
      className={`${styles.horse} ${running ? styles.horseRunning : ""} ${className ?? ""}`}
      style={{ width: size, height: size * 0.82 }}
      aria-hidden
    >
      <svg viewBox="0 0 120 98" width="100%" height="100%">
        {/* 꼬리 */}
        <path
          d="M28 52 C14 46, 8 58, 12 70 C16 64, 20 62, 27 62 Z"
          style={{ fill: dark }}
          stroke={line}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* 뒷다리 쌍 */}
        <g className={styles.legsBack}>
          <rect x="34" y="66" width="9" height="22" rx="4.5" style={{ fill: dark }} stroke={line} strokeWidth="2" />
          <rect x="62" y="66" width="9" height="22" rx="4.5" style={{ fill: dark }} stroke={line} strokeWidth="2" />
        </g>
        {/* 앞다리 쌍 */}
        <g className={styles.legsFront}>
          <rect x="44" y="66" width="9" height="22" rx="4.5" fill={color} stroke={line} strokeWidth="2" />
          <rect x="72" y="66" width="9" height="22" rx="4.5" fill={color} stroke={line} strokeWidth="2" />
        </g>
        {/* 몸통 */}
        <ellipse cx="57" cy="58" rx="31" ry="19" fill={color} stroke={line} strokeWidth="2.2" />
        {/* 번호 조끼(saddle cloth) */}
        <path d="M42 42 h26 v22 a4 4 0 0 1 -4 4 h-18 a4 4 0 0 1 -4 -4 z" fill="#fbf6ea" stroke="#c9a227" strokeWidth="2" />
        <text
          x="55"
          y="60"
          textAnchor="middle"
          fontSize="15"
          fontWeight="700"
          fill="#0f2a1d"
          style={{ fontFamily: "var(--font-board), sans-serif" }}
        >
          {number}
        </text>
        {/* 목 */}
        <path
          d="M76 50 C80 40, 84 34, 88 30 L96 44 C92 50, 88 56, 84 60 Z"
          fill={color}
          stroke={line}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* 머리 */}
        <ellipse cx="94" cy="30" rx="18" ry="16" fill={color} stroke={line} strokeWidth="2.2" />
        {/* 주둥이 */}
        <ellipse cx="106" cy="38" rx="10" ry="8.5" style={{ fill: light }} stroke={line} strokeWidth="2" />
        <circle cx="108" cy="36.5" r="1.3" fill={line} />
        <path d="M103 42 q3 2 6 0" fill="none" stroke={line} strokeWidth="1.5" strokeLinecap="round" />
        {/* 귀 */}
        <path d="M84 18 L86 5 L94 15 Z" fill={color} stroke={line} strokeWidth="2" strokeLinejoin="round" />
        {/* 갈기 */}
        <path
          d="M82 16 C74 18, 72 28, 74 36 C70 40, 72 46, 76 48 C78 40, 82 30, 90 20 Z"
          style={{ fill: dark }}
          stroke={line}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M86 14 C90 8, 98 10, 98 16 C94 14, 90 14, 86 18 Z" style={{ fill: dark }} stroke={line} strokeWidth="1.6" />
        {/* 눈 */}
        <circle cx="96" cy="27" r="3.6" fill={line} />
        <circle cx="97.2" cy="25.8" r="1.2" fill="#fff" />
        {/* 볼터치 */}
        <ellipse cx="99" cy="34" rx="3.2" ry="2" fill="#e88b7a" opacity="0.55" />
      </svg>
      {emblem && (
        <span className={styles.horseEmblem} style={{ fontSize: Math.round(size * 0.16) }}>
          {emblem}
        </span>
      )}
    </span>
  );
}
