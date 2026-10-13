// localStorage 에 JSON 으로 저장하는 작은 외부 저장소 — 관리자(경주 · 이벤트) Mock 의 "서버" 자리.
// 사용자 결정(2026-10-14): 관리자에서 바꾼 경주 · 이벤트 값은 같은 브라우저의 사용자 화면에도 반영한다(다른 탭은 storage 이벤트로).
// React 는 useSyncExternalStore(store.subscribe, store.get, store.getServer) 로 구독한다 — 서버 렌더 · 빌드 · 하이드레이션 동안은
// 기본값(getServer)이라 정적 셸과 첫 클라이언트 렌더가 같고, 하이드레이션 직후 저장값으로 바뀐다.
// React 를 import 하지 않으므로 순수 함수(lib/time.ts 등)도 store.get() 으로 지금 값을 읽을 수 있다. 백엔드가 붙으면 이 저장소들은 지운다.

export interface LocalStore<T> {
  /** 지금 값 — 브라우저는 저장값(없거나 깨졌으면 기본값), 서버는 기본값. 바뀌기 전까지 같은 참조다 */
  get: () => T;
  /** 기본값(서버 렌더 · 하이드레이션용) */
  getServer: () => T;
  set: (value: T) => void;
  /** 저장값을 지우고 기본값으로 */
  clear: () => void;
  subscribe: (listener: () => void) => () => void;
}

/**
 * key: localStorage 키 · fallback: 기본값 · parse: 저장된 JSON 을 검증해 값으로(모양이 틀리면 null → 기본값).
 * 처음 읽을 때 한 번 불러와 들고 있고, 같은 탭의 set · 다른 탭의 storage 이벤트로만 바뀐다.
 */
export function createLocalStore<T>(key: string, fallback: T, parse: (raw: unknown) => T | null): LocalStore<T> {
  const listeners = new Set<() => void>();
  let value = fallback;
  let loaded = false;

  const emit = () => listeners.forEach((listener) => listener());

  const load = () => {
    try {
      const raw = window.localStorage.getItem(key);
      value = raw === null ? fallback : (parse(JSON.parse(raw)) ?? fallback);
    } catch {
      value = fallback; // 사생활 보호 모드 · 깨진 JSON
    }
  };

  const ensure = () => {
    if (loaded || typeof window === "undefined") return;
    loaded = true;
    load();
    window.addEventListener("storage", (e) => {
      if (e.key !== key && e.key !== null) return;
      load();
      emit();
    });
  };

  return {
    get: () => {
      if (typeof window === "undefined") return fallback;
      ensure();
      return value;
    },
    getServer: () => fallback,
    set: (next) => {
      ensure();
      value = next;
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // 저장 공간이 없으면 이 탭에서만 유지된다
      }
      emit();
    },
    clear: () => {
      ensure();
      value = fallback;
      try {
        window.localStorage.removeItem(key);
      } catch {
        // 무시
      }
      emit();
    },
    subscribe: (listener) => {
      ensure();
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
