// 서버에서 불러와 들고 있는 작은 외부 저장소 — 경주 일정 · 출전마 · 기록 · 내 걸기 · 로그인 회원을 여러 화면이 함께 쓴다.
// 처음 읽거나 구독할 때 불러오고, intervalMs 마다 · 창이 다시 보일 때 · refresh() 로 다시 불러온다(같은 순간의 요청은 하나로 합친다).
// React 는 useSyncExternalStore(store.subscribe, store.get, store.getServer) 로 구독한다 — 서버 렌더 · 빌드 · 하이드레이션 동안은
// 빈 값(loaded: false)이라 정적 셸과 첫 클라이언트 렌더가 같다. 받은 값이 그대로면 상태 객체도 그대로라 다시 그리지 않는다.
import { ApiError } from "./api";

export interface RemoteState<T> {
  data: T;
  loaded: boolean; // 한 번이라도 응답을 받았는가(실패 포함)
  error: ApiError | null; // 마지막 요청이 실패했으면 그 오류 — 성공하면 비운다
}

export interface RemoteStore<T> {
  get: () => RemoteState<T>;
  getServer: () => RemoteState<T>;
  subscribe: (listener: () => void) => () => void;
  /** 지금 다시 불러오기 — 진행 중인 요청이 있으면 그 요청을 기다린다 */
  refresh: () => Promise<void>;
}

export function createRemoteStore<T>(load: () => Promise<T>, fallback: T, intervalMs = 0): RemoteStore<T> {
  const initial: RemoteState<T> = { data: fallback, loaded: false, error: null };
  const listeners = new Set<() => void>();
  let state = initial;
  let inflight: Promise<void> | null = null;
  let started = false;

  const update = (next: RemoteState<T>) => {
    const same =
      next.loaded === state.loaded &&
      next.error?.code === state.error?.code &&
      JSON.stringify(next.data) === JSON.stringify(state.data);
    if (same) return;
    state = next;
    listeners.forEach((listener) => listener());
  };

  const refresh = (): Promise<void> => {
    if (typeof window === "undefined") return Promise.resolve();
    inflight ??= load()
      .then(
        (data) => update({ data, loaded: true, error: null }),
        (e: unknown) =>
          update({ ...state, loaded: true, error: e instanceof ApiError ? e : new ApiError(0, "UNKNOWN", String(e)) }),
      )
      .finally(() => {
        inflight = null;
      });
    return inflight;
  };

  const start = () => {
    if (started || typeof window === "undefined") return;
    started = true;
    void refresh();
    if (intervalMs > 0) setInterval(() => void refresh(), intervalMs);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void refresh();
    });
  };

  return {
    get: () => {
      start();
      return state;
    },
    getServer: () => initial,
    subscribe: (listener) => {
      start();
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    refresh,
  };
}
