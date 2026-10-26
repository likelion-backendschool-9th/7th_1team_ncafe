import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, id: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("아이디", { exact: false }).fill(id);
  await page.getByLabel("비밀번호 *", { exact: true }).fill(password);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page).toHaveURL(/\/my$/);
}

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test("회원 화면 전체 흐름: 가입, 로그인, 수정, 비밀번호 변경, 탈퇴", async ({ page }, testInfo) => {
  const id = `ui_${Date.now().toString(36)}_${testInfo.project.name === "mobile" ? "m" : "d"}`;
  const password = "password123";
  const newPassword = "changed12345";
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));

  await page.goto("/my");
  await expect(page.getByRole("link", { name: "로그인", exact: true }).last()).toBeVisible();
  await page.goto("/signup");
  await page.getByLabel("아이디", { exact: false }).fill(id);
  await page.getByLabel("비밀번호 *", { exact: true }).fill(password);
  await page.getByLabel("비밀번호 확인 *", { exact: true }).fill("different123");
  await page.getByLabel("닉네임", { exact: false }).fill("브라우저 회원");
  await page.getByLabel("이메일", { exact: true }).fill("browser@example.com");
  await expectNoOverflow(page);
  await page.getByRole("button", { name: "회원가입", exact: true }).click();
  await expect(page.locator('p[role="alert"]')).toContainText("일치하지 않습니다");
  await page.getByLabel("비밀번호 확인 *", { exact: true }).fill(password);
  await page.getByRole("button", { name: "회원가입", exact: true }).click();
  await expect(page.getByRole("heading", { name: "가입을 환영합니다" })).toBeVisible();

  await page.getByRole("link", { name: "로그인하기" }).click();
  await page.getByLabel("아이디", { exact: false }).fill(id);
  await page.getByLabel("비밀번호 *", { exact: true }).fill("wrongpassword");
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page.locator('p[role="alert"]')).toBeVisible();
  await page.getByLabel("비밀번호 *", { exact: true }).fill(password);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page).toHaveURL(/\/my$/);
  await expect(page.getByRole("heading", { name: "브라우저 회원님의 마이페이지" })).toBeVisible();
  await page.goto("/admin/branches/members");
  await expect(page.getByRole("heading", { name: "접근 권한이 없습니다", exact: true })).toBeVisible();
  await page.goto("/my");
  await expect(page.getByRole("heading", { name: "브라우저 회원님의 마이페이지" })).toBeVisible();

  await page.getByLabel("닉네임", { exact: false }).fill("수정한 회원");
  await page.getByLabel("주소", { exact: true }).fill("서울");
  await page.getByRole("button", { name: "정보 저장" }).click();
  await expect(page.getByRole("status")).toContainText("저장했습니다");
  await page.reload();
  await expect(page.getByRole("heading", { name: "수정한 회원님의 마이페이지" })).toBeVisible();
  await expect(page.getByLabel("주소", { exact: true })).toHaveValue("서울");
  await expectNoOverflow(page);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(page.locator("header")).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath("member-account.png"), fullPage: true });

  const passwordSection = page.locator("section").filter({ has: page.getByRole("heading", { name: "비밀번호 변경", exact: true }) }).last();
  await passwordSection.getByLabel("현재 비밀번호", { exact: true }).fill("wrongpassword");
  await page.getByLabel("새 비밀번호", { exact: true }).fill(newPassword);
  await page.getByLabel("새 비밀번호 확인", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "비밀번호 변경", exact: true }).click();
  await expect(page.locator('p[role="alert"]')).toContainText("현재 비밀번호");
  await passwordSection.getByLabel("현재 비밀번호", { exact: true }).fill(password);
  await page.getByRole("button", { name: "비밀번호 변경", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("비밀번호가 변경됐습니다");
  await login(page, id, newPassword);

  await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("로그아웃했습니다");
  await login(page, id, newPassword);

  const withdrawalSection = page.locator("section").filter({ has: page.getByRole("heading", { name: "회원탈퇴", exact: true }) }).last();
  await withdrawalSection.getByLabel("현재 비밀번호", { exact: true }).fill(newPassword);
  page.once("dialog", dialog => dialog.dismiss());
  await page.getByRole("button", { name: "회원탈퇴", exact: true }).click();
  await expect(page.getByRole("heading", { name: "수정한 회원님의 마이페이지" })).toBeVisible();
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "회원탈퇴", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("회원탈퇴가 완료됐습니다");
  await page.goto("/login");
  await page.getByLabel("아이디", { exact: false }).fill(id);
  await page.getByLabel("비밀번호 *", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page.locator('p[role="alert"]')).toBeVisible();
  expect(errors).toEqual([]);
});

