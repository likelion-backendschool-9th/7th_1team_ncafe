"use client";

import { useMemo, useSyncExternalStore } from "react";
import { horseStore, latestHorses } from "../_lib/horseStore";
import type { Horse } from "../_types";

/**
 * 출전마 구독 — page 가 Service 에서 받은 출전마(정적 셸 · 하이드레이션 값)에 관리자 변경(같은 브라우저)을 겹친다.
 * 하이드레이션 동안에는 받은 값 그대로라 정적 셸과 맞고, 직후 저장된 변경이 있으면 바뀐다. 다른 탭에서 바꿔도 따라간다.
 */
export function useRaceHorses(serverHorses: Horse[]): Horse[] {
  const versions = useSyncExternalStore(horseStore.subscribe, horseStore.get, horseStore.getServer);
  return useMemo(() => latestHorses(versions, serverHorses), [versions, serverHorses]);
}
