import { test, expect, type Page } from "@playwright/test";

const hqId = process.env.ADMIN_TEST_HQ_ID;
const branchId = process.env.ADMIN_TEST_BRANCH_ID;
const password = process.env.ADMIN_TEST_PASSWORD;
test.skip(!hqId || !branchId || !password, "관리자 테스트 전용 계정 환경변수가 필요합니다.");

async function login(page: Page, id: string) {
  await page.goto("/login");
  await page.getByLabel("아이디", { exact: false }).fill(id);
  await page.getByLabel("비밀번호 *", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/branches\/members$/);
  await expect(page.getByRole("heading", { name: "회원 목록", exact: true })).toBeVisible();
}

test("본사: 회원 목록·상세·추가·수정·삭제 및 경주 접근", async ({ page }, info) => {
  const loginId = `adm_${Date.now().toString(36)}_${info.project.name === "mobile" ? "m" : "d"}`;
  await login(page, hqId!);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("hq-member-list.png"), fullPage: true });
  await page.getByRole("link", { name: "회원 추가", exact: true }).click();
  await page.getByLabel("아이디", { exact: false }).fill(loginId);
  await page.getByLabel("초기 비밀번호", { exact: false }).fill("password123");
  await page.getByLabel("비밀번호 확인", { exact: false }).fill("password123");
  await page.getByLabel("닉네임", { exact: false }).fill("관리자 등록 회원");
  await page.getByRole("button", { name: "회원 저장" }).click();
  await expect(page.getByRole("heading", { name: "회원 상세", exact: true })).toBeVisible();
  await expect(page.getByText(loginId, { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "회원 수정", exact: true }).click();
  await expect(page.getByRole("heading", { name: "회원 수정", exact: true })).toBeVisible();
  await page.locator('input[name="nickname"]:visible').fill("본사 수정 회원");
  await page.locator('input[name="address1"]:visible').fill("서울 본사");
  await page.getByRole("button", { name: "회원 저장" }).click();
  await expect(page.getByText("본사 수정 회원", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("서울 본사", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "회원 삭제", exact: true }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "삭제 확정" }).click();
  await expect(page.getByRole("heading", { name: "회원 목록", exact: true })).toBeVisible();
  await page.getByLabel("회원 검색").fill(loginId);
  await expect(page.getByText("조회된 회원이 없습니다.")).toBeVisible();
  await page.goto("/admin/race");
  await expect(page.getByRole("heading", { name: "본사 관리자 전용", exact: true })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "관리자 메뉴" })).toBeVisible();
});

test("지점: 회원 조회 가능, 회원 쓰기·경주 접근 불가", async ({ page }, info) => {
  await login(page, branchId!);
  await expect(page.getByText("지점 관리자 · 회원 조회 전용")).toBeVisible();
  await expect(page.getByRole("link", { name: "회원 추가", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /경주 관리/ })).toHaveCount(0);
  await page.getByLabel("회원 검색").fill(hqId!);
  await page.getByRole("link", { name: "상세 보기" }).first().click();
  await expect(page.getByRole("heading", { name: "회원 상세", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "회원 수정", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "회원 삭제", exact: true })).toHaveCount(0);
  const detailPath = new URL(page.url()).pathname;
  for (const path of ["/admin/branches/members/create", `${detailPath}/update`, `${detailPath}/delete`]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "회원 조회 전용", exact: true })).toBeVisible();
  }
  await page.goto("/admin/race");
  await expect(page.getByRole("heading", { name: "본사 관리자 전용", exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("branch-access-denied.png"), fullPage: true });
});
