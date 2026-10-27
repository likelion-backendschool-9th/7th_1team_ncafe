-- 지점 3곳 초기 데이터 (프론트 목업 frontend/app/(site)/seat/_data/branches.ts와 같은 값).
-- data.sql이 아니라 자동 실행되지 않는다 — spring.sql.init.data-locations에 classpath:branches_data.sql을 넣어 실행한다.
-- 서버를 시작할 때마다 실행되지만 같은 id가 있으면 넣지 않는다 — 관리자가 고친 값은 그대로 둔다.
-- 좌석(seats_data.sql) · 메뉴 판매 상태가 지점 id를 가리키므로 seats_data.sql보다 먼저 실행한다.
-- 평면도(sections · fixtures)는 아직 프론트 _data/floorPlan.ts에 있어 비워 둔다.

INSERT INTO branches (id, name, address, open, created_date)
SELECT 'mapo', '마포 본점', '서울시 마포구 트랙길 7, 1층', TRUE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE id = 'mapo');

INSERT INTO branches (id, name, address, open, created_date)
SELECT 'gangnam', '강남점', '서울시 강남구 더비로 21, 2층', TRUE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE id = 'gangnam');

INSERT INTO branches (id, name, address, open, created_date)
SELECT 'seongsu', '성수점', '서울시 성동구 패독길 5, 1층', TRUE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE id = 'seongsu');
