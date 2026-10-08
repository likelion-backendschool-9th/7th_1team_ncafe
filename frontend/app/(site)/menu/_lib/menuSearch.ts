import type { Category, Menu } from "../_types";

/**
 * 손님용 메뉴판 검색 — 순수 함수.
 * - 이름: 부분 일치 + 한글 초성("ㅇㅁㄹ" → 아메리카노, "아ㅁ" 처럼 섞어도 된다)
 * - 영문명 · 설명: 부분 일치
 * - 카테고리명: 앞부분 일치 — "커피" 가 "논커피" 에 걸리지 않게
 * - 공백·대소문자는 무시한다("아이스아메리카노", "ICED" 도 걸린다).
 * - 입력 중인 마지막 글자는 덜 조합된 상태도 받아 준다("칼" → 카라멜, "카람" → 카라멜).
 *   검색창이 글자를 칠 때마다 걸러서, 조합 중간에 결과가 0개로 깜빡이지 않게 하기 위해서다.
 */

// 한글 음절(가–힣) = 0xAC00 + (초성 × 21 + 중성) × 28 + 종성
const SYLLABLE_BASE = 0xac00;
const SYLLABLE_COUNT = 11172;
const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
/** 종성 — 0 번은 "받침 없음" */
const JONG = [
  "", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ",
  "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

function decompose(ch: string) {
  const code = ch.charCodeAt(0) - SYLLABLE_BASE;
  if (code < 0 || code >= SYLLABLE_COUNT) return null;
  return { cho: Math.floor(code / 588), jung: Math.floor((code % 588) / 28), jong: code % 28 };
}

/** 음절의 초성 자모, 음절이 아니면 null */
function initialOf(ch: string | undefined): string | null {
  const s = ch === undefined ? null : decompose(ch);
  return s ? CHO[s.cho] : null;
}

const isInitial = (ch: string) => ch.length === 1 && CHO.includes(ch);

/**
 * 검색어 글자 q 가 본문 글자 t 에 들어맞는지.
 * initials: 자음 하나를 초성으로 볼지(이름만). 입력 중인 마지막 글자는 어느 필드든 초성으로 본다.
 */
function charMatches(q: string, t: string, next: string | undefined, last: boolean, initials: boolean): boolean {
  if (q === t) return true;
  if (isInitial(q)) return (initials || last) && initialOf(t) === q;
  if (!last) return false;

  const qs = decompose(q);
  const ts = decompose(t);
  if (!qs || !ts || qs.cho !== ts.cho || qs.jung !== ts.jung) return false;
  // "카" → 칼: 받침을 아직 안 쳤다
  if (qs.jong === 0) return true;
  // "카람" → 카라멜: 다음 글자의 초성이 잠깐 받침으로 붙었다
  return ts.jong === 0 && initialOf(next) === JONG[qs.jong];
}

interface MatchOptions {
  /** 자음 하나를 초성으로 본다(이름만) */
  initials?: boolean;
  /** 맨 앞에서만 찾는다(카테고리명) */
  prefix?: boolean;
}

/**
 * text 안에 query 가 들어 있는지. 둘 다 normalizeQuery() 를 거친 값이다.
 * 초성을 안 쓰는 필드(설명 등)는 한 글자 검색어에 마지막 글자 봐주기를 하지 않는다 — "ㄷ" 하나로 설명이 줄줄이 걸리지 않게.
 */
function includes(text: string, query: string, { initials = false, prefix = false }: MatchOptions = {}): boolean {
  if (prefix ? text.startsWith(query) : text.includes(query)) return true;
  const last = query.length - 1;
  const lenient = initials || last > 0;
  const lastStart = text.length - query.length;
  for (let start = 0; start <= (prefix ? Math.min(0, lastStart) : lastStart); start++) {
    let ok = true;
    for (let j = 0; ok && j <= last; j++) {
      ok = charMatches(query[j], text[start + j], text[start + j + 1], lenient && j === last, initials);
    }
    if (ok) return true;
  }
  return false;
}

/** 검색어·본문 정규화 — 공백 제거 + 소문자 */
export function normalizeQuery(text: string): string {
  return text.normalize("NFC").replace(/\s+/g, "").toLowerCase();
}

/** 메뉴가 검색어에 걸리는지. query 는 normalizeQuery() 를 거친 값이고, 빈 문자열이면 모두 통과한다. */
export function matchesMenu(menu: Menu, query: string, category?: Category): boolean {
  if (!query) return true;
  const has = (field: string, options?: MatchOptions) => includes(normalizeQuery(field), query, options);

  return (
    has(menu.name, { initials: true }) ||
    has(menu.engName) ||
    has(menu.description) ||
    (category !== undefined && (has(category.name, { prefix: true }) || has(category.engName, { prefix: true })))
  );
}
