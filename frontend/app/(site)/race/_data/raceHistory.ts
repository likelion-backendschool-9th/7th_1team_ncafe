import type { RaceResult } from "../_types";

// 지난 경주 결과 Mock(BLUEPRINT 5.5) — 최신 경주가 앞. ranking 은 7마리 전체(1위~7위의 horseId).
// 출전표의 "최근 성적"은 이 기록에서 계산하므로, 숫자를 바꾸면 카드도 함께 바뀐다.
// 다음 경주 번호는 여기의 가장 큰 번호 + 1(Race #13).
export const RACE_HISTORY: RaceResult[] = [
  { raceNo: 12, date: "2026-10-12T18:00:00+09:00", ranking: [7, 2, 1, 3, 5, 4, 6] },
  { raceNo: 11, date: "2026-10-12T12:30:00+09:00", ranking: [1, 3, 2, 5, 6, 7, 4] },
  { raceNo: 10, date: "2026-10-11T18:00:00+09:00", ranking: [4, 5, 3, 2, 1, 6, 7] },
  { raceNo: 9, date: "2026-10-11T12:30:00+09:00", ranking: [3, 6, 5, 1, 7, 2, 4] },
  { raceNo: 8, date: "2026-10-10T18:00:00+09:00", ranking: [2, 1, 6, 3, 4, 7, 5] },
];
