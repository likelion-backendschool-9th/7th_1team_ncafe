-- 회원 등급 4단계 초기 데이터 (팀 확정안: 지금까지 받은 쿠폰 수(누적) 기준).
-- data.sql이 아니라 자동 실행되지 않는다 — spring.sql.init.data-locations에 classpath:grades_data.sql을 넣어 실행한다.
-- 서버를 시작할 때마다 실행되지만 같은 이름이 있으면 넣지 않는다 — 관리자가 고친 값은 그대로 둔다.
-- 메뉴의 해금 등급(menus.required_grade_id)이 이 등급을 가리키므로 menus_data.sql보다 먼저 실행한다.

INSERT INTO grade (name, min_total_coupons)
SELECT '신마', 0
WHERE NOT EXISTS (SELECT 1 FROM grade WHERE name = '신마');

INSERT INTO grade (name, min_total_coupons)
SELECT '준마', 10
WHERE NOT EXISTS (SELECT 1 FROM grade WHERE name = '준마');

INSERT INTO grade (name, min_total_coupons)
SELECT '명마', 25
WHERE NOT EXISTS (SELECT 1 FROM grade WHERE name = '명마');

INSERT INTO grade (name, min_total_coupons)
SELECT '전설마', 40
WHERE NOT EXISTS (SELECT 1 FROM grade WHERE name = '전설마');
