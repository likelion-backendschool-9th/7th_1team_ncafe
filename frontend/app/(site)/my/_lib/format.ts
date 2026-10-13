// 마이페이지 표시용 순수 함수.

const pad = (n: number) => String(n).padStart(2, "0");

/** "10/13 18:02" — 주문·쿠폰 내역은 클라이언트에서만 생기므로 지역 시각으로 그려도 하이드레이션이 어긋나지 않는다. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "2026-10-01" → "2026.10.01" */
export function formatDate(ymd: string): string {
  return ymd.replaceAll("-", ".");
}

/** 7 → "0007" */
export function serial(n: number, digits = 4): string {
  return String(n).padStart(digits, "0");
}

export function won(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}
