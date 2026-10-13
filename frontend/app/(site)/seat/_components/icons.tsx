import type { SVGProps } from "react";

// /seat 전용 작은 아이콘 — 의자 상태(✓ · 사람 · 자물쇠 · 공구) · 패널(핀 · 종 · 초기화 · 화살표) · 확대/축소.
// 이모지는 크기 · 모양이 기기마다 달라 어두운 캔버스의 28px 의자 안에서 흔들리므로 SVG 로 둔다(currentColor).
type IconProps = SVGProps<SVGSVGElement>;

function Svg({ children, ...props }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden focusable="false" {...props}>
      {children}
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function PersonIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="8" cy="5" r="3" fill="currentColor" />
      <path d="M2.5 14.5a5.5 5.5 0 0 1 11 0z" fill="currentColor" />
    </Svg>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="7" width="10" height="7.5" rx="1.6" fill="currentColor" />
      <path d="M5.5 7V5.2a2.5 2.5 0 0 1 5 0V7" stroke="currentColor" strokeWidth="1.7" />
    </Svg>
  );
}

export function WrenchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M13.6 4.6a3.6 3.6 0 0 1-4.7 4.2l-4.6 4.6a1.3 1.3 0 0 1-1.9-1.9l4.6-4.6a3.6 3.6 0 0 1 4.2-4.7L9.1 4.3l.6 2 2 .6z"
        fill="currentColor"
      />
    </Svg>
  );
}

export function PinIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 1.5A4.5 4.5 0 0 0 3.5 6c0 3.4 4.5 8.5 4.5 8.5S12.5 9.4 12.5 6A4.5 4.5 0 0 0 8 1.5z" fill="currentColor" />
      <circle cx="8" cy="6" r="1.7" fill="#fff" />
    </Svg>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 1.5a4 4 0 0 0-4 4v2.8L2.5 11h11L12 8.3V5.5a4 4 0 0 0-4-4z" fill="currentColor" />
      <path d="M6.3 12.8a1.8 1.8 0 0 0 3.4 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

export function ResetIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.2 8a4.8 4.8 0 1 0 1.4-3.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M3 2.5v3h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 3l-5 5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ChevronUpIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 10l5-5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

export function MinusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

export function FitIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 2.5H2.5V6M10 2.5h3.5V6M6 13.5H2.5V10M10 13.5h3.5V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </Svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Svg>
  );
}

export function CupIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 5h8v4.5A3.5 3.5 0 0 1 7.5 13h-1A3.5 3.5 0 0 1 3 9.5z" fill="currentColor" />
      <path d="M11 6.5h1.2a1.8 1.8 0 0 1 0 3.6H11" stroke="currentColor" strokeWidth="1.4" />
    </Svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2.5 8h10M8.5 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
