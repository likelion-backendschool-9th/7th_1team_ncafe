import { test, expect } from "@playwright/test";

test.skip(!process.env.BRANCH_OPERATIONS_TEST, "Requires a disposable H2 instance with branch_admins_data.sql");

for (const branch of ["mapo", "gangnam", "seongsu"]) {
  test(`${branch}: 지점 운영 화면과 다른 지점 접근 차단`, async ({ page }, info) => {
    await page.goto("/login");
    await page.locator('input[name="loginId"]').fill(`test_${branch}_admin`);
    await page.locator('input[name="password"]').fill("branch-admin-pass");
    await page.getByRole("button", { name: "로그인", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/branches\/members$/);
    await page.getByRole("link", { name: /지점 운영/ }).click();
    await expect(page.getByRole("heading", { name: "지점 운영 관리", exact: true })).toBeVisible();
    const selector = page.getByLabel("담당 지점");
    await expect(selector).toHaveValue(branch);
    await expect(selector.locator("option")).toHaveCount(1);

    const response = await page.request.get(`/api/v1/admin/branches/${branch}/menus`);
    expect(response.ok()).toBeTruthy();
    const [menu] = await response.json();
    await page.getByRole("button", { name: "메뉴 판매", exact: true }).click();
    const status = page.getByLabel(`${menu.nameKor} 판매 상태`, { exact: true });
    await status.selectOption("HIDDEN");
    await expect(page.getByText("변경사항을 저장했습니다.", { exact: true })).toBeVisible();
    await expect(status).toHaveValue("HIDDEN");
    const publicMenus = await (await page.request.get(`/api/v1/menus?branchId=${branch}`)).json();
    expect(publicMenus.some((m: { id: number }) => m.id === menu.menuId)).toBe(false);
    await status.selectOption(menu.status);
    await expect(status).toHaveValue(menu.status);

    await page.getByRole("button", { name: "좌석·예약", exact: true }).click();

    const seatResponse = await page.request.get(`/api/v1/admin/branches/${branch}/seats`);
    const [seat] = await seatResponse.json();
    const toggle = page.getByRole("button", { name: `${seat.code} ${seat.underRepair ? "수리 해제" : "수리 설정"}`, exact: true });
    await toggle.click();
    const undo = page.getByRole("button", { name: `${seat.code} ${seat.underRepair ? "수리 설정" : "수리 해제"}`, exact: true });
    await expect(undo).toBeVisible();
    await undo.click();
    await expect(toggle).toBeVisible();
    await expect(page.getByLabel("조회 날짜")).not.toHaveValue("");
    const other = branch === "mapo" ? "gangnam" : "mapo";
    expect((await page.request.get(`/api/v1/admin/branches/${other}/seats`)).status()).toBe(403);
    expect((await page.request.get("/api/v1/admin/menus")).status()).toBe(403);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`${branch}-operations.png`), fullPage: true });
  });
}
