import { test, expect } from "@playwright/test";

for (const legacySeats of [false, true]) {
  test(`작업 이력 404가 메뉴 탭을 막지 않음 (${legacySeats ? "이전" : "최신"} 좌석 응답)`, async ({ page }) => {
    let logRequests = 0;
    await page.route("**/api/v1/**", async route => {
      const path = new URL(route.request().url()).pathname;
      let data: unknown = [];
      if (path.endsWith("/auth/me")) data = { no: 1, loginId: "test-hq", nickname: "본사", role: "HQ_ADMIN" };
      else if (path.endsWith("/branch-admin/branches")) data = ["mapo", "gangnam", "seongsu"].map(id => ({ id, name: id }));
      else if (path.endsWith("/operation-logs")) {
        logRequests++;
        await route.fulfill({ status: 404, json: { message: "요청한 API를 찾을 수 없습니다." } });
        return;
      } else if (path.includes("/admin/branches/") && path.endsWith("/menus")) data = [{ menuId: 1, nameKor: "테스트 메뉴", status: "ON_SALE" }];
      else if (path.includes("/admin/branches/") && path.endsWith("/seats")) data = [{ code: "T01", capacity: 2, underRepair: false, ...(legacySeats ? {} : { repairChairNos: [] }) }];
      await route.fulfill({ json: data });
    });
    const errors: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto("/admin/branches/operations");
    if (legacySeats) await expect(page.locator('p[role="alert"]')).toContainText("최신 좌석 기능이 반영되지 않았습니다");
    else await expect(page.getByRole("heading", { name: "선택 좌석 관리" })).toBeVisible();
    expect(logRequests).toBe(0);
    await page.getByRole("button", { name: "메뉴 판매", exact: true }).click();
    for (const branch of ["mapo", "gangnam", "seongsu"]) {
      await page.getByLabel("담당 지점").selectOption(branch);
      await expect(page.getByLabel("테스트 메뉴 판매 상태", { exact: true })).toHaveValue("ON_SALE");
      await expect(page.locator('p[role="alert"]')).toHaveCount(0);
    }
    expect(logRequests).toBe(0);
    await page.getByRole("button", { name: "작업 이력", exact: true }).click();
    await expect(page.locator('p[role="alert"]')).toContainText("최신 코드로 백엔드를 재시작");
    await page.getByRole("button", { name: "메뉴 판매", exact: true }).click();
    await expect(page.getByLabel("테스트 메뉴 판매 상태", { exact: true })).toBeVisible();
    await expect(page.locator('p[role="alert"]')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
