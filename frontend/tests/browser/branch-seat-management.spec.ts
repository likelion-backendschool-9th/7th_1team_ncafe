import { test, expect, type APIRequestContext } from "@playwright/test";

test.skip(!process.env.BRANCH_SEAT_MANAGEMENT_TEST, "Requires a disposable seeded H2 backend");

async function write(api: APIRequestContext, path: string, data: unknown, method = "POST") {
  const csrf = await (await api.get("/api/v1/auth/csrf")).json();
  return api.fetch(`/api/v1${path}`, { method, headers: { [csrf.headerName]: csrf.token }, data });
}

test("좌석 예약 확인·수리 충돌 안내·개별 수리·작업 이력", async ({ page }, info) => {
  const login = await write(page.request, "/auth/login", { loginId: "e2eadmin", password: "e2e-admin-pass" });
  expect(login.ok()).toBeTruthy();
  const date = new Date(Date.now() + 9 * 3600000 + 86400000).toISOString().slice(0, 10);
  const reserve = await write(page.request, "/seats/reservations", {
    slot: { branchId: "mapo", date, start: "09:00" }, people: 1, chairIds: ["T01-1"],
  });
  expect(reserve.ok(), await reserve.text()).toBeTruthy();
  const booking = await reserve.json();
  const branchLogin = await write(page.request, "/auth/login", { loginId: "test_mapo_admin", password: "branch-admin-pass" });
  expect(branchLogin.ok()).toBeTruthy();
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  try {
    await page.goto("/admin/branches/operations");
    await expect(page.getByLabel("담당 지점")).toHaveValue("mapo");
    await page.getByLabel("조회 날짜").fill(date);
    const chair = page.locator('button[data-chair="T01-1"]');
    await expect(chair).toBeEnabled();
    await chair.click();
    await expect(page.getByText("T01 1번 선택됨", { exact: true })).toBeVisible();
    const selection = page.getByRole("region", { name: "선택 좌석 예약" });
    await expect(selection).toContainText(`#${booking.id}`);
    await expect(selection.getByRole("button", { name: "방문 확인", exact: true })).toBeVisible();
    const repair = page.getByRole("button", { name: "T01 1번 수리 설정", exact: true });
    await repair.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText(date);
    await expect(dialog).toContainText(`#${booking.id}`);
    await page.screenshot({ path: info.outputPath("repair-confirmation.png"), fullPage: true });
    await dialog.getByRole("button", { name: "돌아가기", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    let seats = await (await page.request.get("/api/v1/admin/branches/mapo/seats")).json();
    expect(seats.find((s: { code: string }) => s.code === "T01").repairChairNos).toEqual([]);
    await repair.click();
    await dialog.getByRole("button", { name: "예약 확인 후 수리 설정", exact: true }).click();
    const undo = page.getByRole("button", { name: "T01 1번 수리 해제", exact: true });
    await expect(undo).toBeVisible();
    await expect(page.getByText("T01 1번 선택됨", { exact: true })).toBeVisible();
    await expect(chair).toHaveAttribute("aria-label", /수리 중/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath("individual-chair-repair.png"), fullPage: true });
    const statuses = await (await page.request.get(`/api/v1/seats/status?branchId=mapo&date=${date}&start=09:00`)).json();
    expect(statuses["T01-1"]).toBe("REPAIR");
    expect(statuses["T01-2"]).toBeUndefined();
    const rejected = await write(page.request, "/seats/reservations", {
      slot: { branchId: "mapo", date, start: "10:00" }, people: 1, chairIds: ["T01-1"],
    });
    expect(rejected.status()).toBe(409);
    await expect(chair).toBeEnabled();
    await chair.click();
    await undo.click();
    await expect(repair).toBeVisible();
    // Whole-table repairs require the same booking acknowledgement.
    await page.getByRole("button", { name: "T01 수리 설정", exact: true }).click();
    await expect(dialog).toContainText("T01 전체");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await page.getByRole("button", { name: "메뉴 판매", exact: true }).click();
    const menus = await (await page.request.get("/api/v1/admin/branches/mapo/menus")).json();
    const menu = menus[0];
    const status = page.getByLabel(`${menu.nameKor} 판매 상태`, { exact: true });
    await status.selectOption(menu.status === "HIDDEN" ? "ON_SALE" : "HIDDEN");
    await expect(status).not.toHaveValue(menu.status);
    await status.selectOption(menu.status);
    await expect(status).toHaveValue(menu.status);
    await page.getByRole("button", { name: "작업 이력", exact: true }).click();
    await expect(page.getByRole("heading", { name: "관리 작업 이력", exact: true })).toBeVisible();
    await expect(page.getByText(/test_mapo_admin · 의자 수리 · T01-1/).first()).toBeVisible();
    await expect(page.getByText(new RegExp(`test_mapo_admin · 메뉴 판매 상태 · ${menu.menuId}`)).first()).toBeVisible();
    expect((await page.request.get("/api/v1/admin/branches/gangnam/operation-logs")).status()).toBe(403);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath("operation-history.png"), fullPage: true });
    expect(errors).toEqual([]);
    seats = await (await page.request.get("/api/v1/admin/branches/mapo/seats")).json();
    expect(seats.find((s: { code: string }) => s.code === "T01").repairChairNos).toEqual([]);
  } finally {
    await write(page.request, "/admin/branches/mapo/seats/T01/chairs/1/repair", { underRepair: false }, "PATCH");
    await write(page.request, "/auth/login", { loginId: "e2eadmin", password: "e2e-admin-pass" });
    await write(page.request, `/seats/reservations/${booking.id}`, undefined, "DELETE");
  }
});
