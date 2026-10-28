-- 지점 3곳 초기 데이터 (프론트 목업이던 값).
-- data.sql이 아니라 자동 실행되지 않는다 — spring.sql.init.data-locations에 classpath:branches_data.sql을 넣어 실행한다.
-- 서버를 시작할 때마다 실행되지만 같은 id가 있으면 넣지 않는다 — 관리자가 고친 값은 그대로 둔다.
-- 좌석(seats_data.sql) · 메뉴 판매 상태가 지점 id를 가리키므로 seats_data.sql보다 먼저 실행한다.
-- sort는 손님 화면의 지점 순서(작을수록 앞) — 맨 앞인 마포 본점이 기본 선택이다.
-- 평면도(sections: 구역, fixtures: 창문 · 카운터 같은 구조물)는 지점마다 따로 둔다. 좌표는 평면도 기준 %(좌상단 x, y · 폭 w · 높이 h).
-- 지금은 세 지점이 같은 평면도로 시작하고, 관리자 지점 화면에서 지점별로 고칠 수 있다.
-- JSON '...' 은 H2 · PostgreSQL 둘 다 받는 JSON 값 표기다.

INSERT INTO branches (id, name, address, sections, fixtures, open, sort, created_date)
SELECT 'mapo', '마포 본점', '서울시 마포구 트랙길 7, 1층',
       JSON '[{"section":"TRACKSIDE","x":3.6,"y":5.7,"w":69.8,"h":21.4},{"section":"GRANDSTAND","x":3.6,"y":29.3,"w":69.8,"h":40.7},{"section":"LOUNGE","x":3.6,"y":73.2,"w":56.4,"h":22.8},{"section":"PADDOCK","x":75.1,"y":5.7,"w":21.3,"h":64.4}]',
       JSON '[{"id":"window","kind":"WINDOW","label":"WINDOW","labelKo":"창가","x":0,"y":0,"w":100,"h":3.4},{"id":"bar","kind":"BAR","label":"BAR","x":89.3,"y":8.3,"w":4.9,"h":58.4},{"id":"counter","kind":"COUNTER","label":"COUNTER","labelKo":"주문","x":61.8,"y":73.2,"w":20.9,"h":22.8},{"id":"restroom","kind":"RESTROOM","label":"RESTROOM","labelKo":"화장실","x":84.4,"y":73.2,"w":12,"h":22.8},{"id":"entrance","kind":"ENTRANCE","label":"ENTRANCE","labelKo":"출입구","x":3.6,"y":97.7,"w":11.5,"h":2.3},{"id":"aisle-h","kind":"AISLE","label":"통로","x":3.6,"y":71.1,"w":92.9,"h":0},{"id":"aisle-v","kind":"AISLE","label":"통로","x":74.2,"y":5.7,"w":0,"h":64.4}]',
       TRUE, 1, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE id = 'mapo');

INSERT INTO branches (id, name, address, sections, fixtures, open, sort, created_date)
SELECT 'gangnam', '강남점', '서울시 강남구 더비로 21, 2층',
       JSON '[{"section":"TRACKSIDE","x":3.6,"y":5.7,"w":69.8,"h":21.4},{"section":"GRANDSTAND","x":3.6,"y":29.3,"w":69.8,"h":40.7},{"section":"LOUNGE","x":3.6,"y":73.2,"w":56.4,"h":22.8},{"section":"PADDOCK","x":75.1,"y":5.7,"w":21.3,"h":64.4}]',
       JSON '[{"id":"window","kind":"WINDOW","label":"WINDOW","labelKo":"창가","x":0,"y":0,"w":100,"h":3.4},{"id":"bar","kind":"BAR","label":"BAR","x":89.3,"y":8.3,"w":4.9,"h":58.4},{"id":"counter","kind":"COUNTER","label":"COUNTER","labelKo":"주문","x":61.8,"y":73.2,"w":20.9,"h":22.8},{"id":"restroom","kind":"RESTROOM","label":"RESTROOM","labelKo":"화장실","x":84.4,"y":73.2,"w":12,"h":22.8},{"id":"entrance","kind":"ENTRANCE","label":"ENTRANCE","labelKo":"출입구","x":3.6,"y":97.7,"w":11.5,"h":2.3},{"id":"aisle-h","kind":"AISLE","label":"통로","x":3.6,"y":71.1,"w":92.9,"h":0},{"id":"aisle-v","kind":"AISLE","label":"통로","x":74.2,"y":5.7,"w":0,"h":64.4}]',
       TRUE, 2, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE id = 'gangnam');

INSERT INTO branches (id, name, address, sections, fixtures, open, sort, created_date)
SELECT 'seongsu', '성수점', '서울시 성동구 패독길 5, 1층',
       JSON '[{"section":"TRACKSIDE","x":3.6,"y":5.7,"w":69.8,"h":21.4},{"section":"GRANDSTAND","x":3.6,"y":29.3,"w":69.8,"h":40.7},{"section":"LOUNGE","x":3.6,"y":73.2,"w":56.4,"h":22.8},{"section":"PADDOCK","x":75.1,"y":5.7,"w":21.3,"h":64.4}]',
       JSON '[{"id":"window","kind":"WINDOW","label":"WINDOW","labelKo":"창가","x":0,"y":0,"w":100,"h":3.4},{"id":"bar","kind":"BAR","label":"BAR","x":89.3,"y":8.3,"w":4.9,"h":58.4},{"id":"counter","kind":"COUNTER","label":"COUNTER","labelKo":"주문","x":61.8,"y":73.2,"w":20.9,"h":22.8},{"id":"restroom","kind":"RESTROOM","label":"RESTROOM","labelKo":"화장실","x":84.4,"y":73.2,"w":12,"h":22.8},{"id":"entrance","kind":"ENTRANCE","label":"ENTRANCE","labelKo":"출입구","x":3.6,"y":97.7,"w":11.5,"h":2.3},{"id":"aisle-h","kind":"AISLE","label":"통로","x":3.6,"y":71.1,"w":92.9,"h":0},{"id":"aisle-v","kind":"AISLE","label":"통로","x":74.2,"y":5.7,"w":0,"h":64.4}]',
       TRUE, 3, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE id = 'seongsu');
