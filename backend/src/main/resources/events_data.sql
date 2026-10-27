-- 이벤트 6개 초기 데이터 (프론트 목업이던 값 — 지점 3곳에 쿠폰 지급 · 일반 참여, 선착순 마감, 예정, 종료 예시를 하나씩).
-- data.sql이 아니라 자동 실행되지 않는다 — spring.sql.init.data-locations에 classpath:events_data.sql을 넣어 실행한다.
-- 서버를 시작할 때마다 실행되지만 같은 제목이 있으면 넣지 않는다 — 관리자가 고친 값은 그대로 둔다.
-- 기간은 시작일 00:00 · 종료일 23:59:59(KST) 시각이다(종료일 당일까지 진행 중).
-- 쿠폰 지급(선착순) 이벤트의 crowded는 예시로 미리 채운 참여 인원이라 신청 기록(events_applies)은 없다. 일반 참여 이벤트는 crowded · capacity가 NULL이다.

INSERT INTO events (branch_id, title, thumbnail, image_hero, image_detail, description, how_to, notes,
                    date_start, date_end, coupon, coupon_amount, capacity, crowded, visible, status)
SELECT 'mapo', 'FIRST GATE 30', NULL, NULL, NULL,
       '마포 본점 리뉴얼 기념 — 선착순 30명에게 레이스 쿠폰 2장을 드려요.',
       '이벤트 페이지에서 [참여 신청]을 눌러요.
선착순 30명 안에 들면 쿠폰 2장이 바로 지급돼요.
받은 쿠폰으로 DAILY RACE 에 참여해 보세요.',
       '회원 한 명당 한 번만 신청할 수 있어요.
신청 후에는 취소할 수 없어요.
선착순 인원이 차면 바로 마감돼요.',
       '2026-10-20 00:00:00+09:00', '2026-11-09 23:59:59+09:00', TRUE, 2, 30, 12, FALSE, NULL
WHERE NOT EXISTS (SELECT 1 FROM events WHERE title = 'FIRST GATE 30');

INSERT INTO events (branch_id, title, thumbnail, image_hero, image_detail, description, how_to, notes,
                    date_start, date_end, coupon, coupon_amount, capacity, crowded, visible, status)
SELECT 'gangnam', 'DERBY NIGHT', NULL, NULL, NULL,
       '강남점 금요일 밤 경주 응원전 — 선착순 20명에게 쿠폰 1장을 드렸어요.',
       '이벤트 페이지에서 [참여 신청]을 눌러요.
선착순 20명 안에 들면 쿠폰 1장이 바로 지급돼요.',
       '회원 한 명당 한 번만 신청할 수 있어요.
선착순 인원이 차면 바로 마감돼요.',
       '2026-10-24 00:00:00+09:00', '2026-11-01 23:59:59+09:00', TRUE, 1, 20, 20, FALSE, NULL
WHERE NOT EXISTS (SELECT 1 FROM events WHERE title = 'DERBY NIGHT');

INSERT INTO events (branch_id, title, thumbnail, image_hero, image_detail, description, how_to, notes,
                    date_start, date_end, coupon, coupon_amount, capacity, crowded, visible, status)
SELECT 'seongsu', 'CHEER BOARD', NULL, NULL, NULL,
       '성수점 전광판에 응원 메시지를 띄워요. 신청한 분의 닉네임을 경주 전에 함께 보여 드려요.',
       '이벤트 페이지에서 [참여 신청]을 눌러요.
매장 전광판에 내 닉네임이 응원단으로 올라가요.',
       '쿠폰이 지급되지 않는 참여 이벤트예요.
회원 한 명당 한 번만 신청할 수 있어요.',
       '2026-10-15 00:00:00+09:00', '2026-11-15 23:59:59+09:00', FALSE, NULL, NULL, NULL, FALSE, NULL
WHERE NOT EXISTS (SELECT 1 FROM events WHERE title = 'CHEER BOARD');

INSERT INTO events (branch_id, title, thumbnail, image_hero, image_detail, description, how_to, notes,
                    date_start, date_end, coupon, coupon_amount, capacity, crowded, visible, status)
SELECT 'seongsu', 'SEONGSU WELCOME', NULL, NULL, NULL,
       '성수점 오픈 기념 — 선착순 100명에게 쿠폰 1장을 드려요. 기간 제한 없이 마감될 때까지 진행해요.',
       '이벤트 페이지에서 [참여 신청]을 눌러요.
선착순 100명 안에 들면 쿠폰 1장이 바로 지급돼요.',
       '회원 한 명당 한 번만 신청할 수 있어요.
신청 후에는 취소할 수 없어요.',
       NULL, NULL, TRUE, 1, 100, 37, FALSE, NULL
WHERE NOT EXISTS (SELECT 1 FROM events WHERE title = 'SEONGSU WELCOME');

-- 예정 예시 — 노출 허가를 켜 손님 화면에 미리 알린다
INSERT INTO events (branch_id, title, thumbnail, image_hero, image_detail, description, how_to, notes,
                    date_start, date_end, coupon, coupon_amount, capacity, crowded, visible, status)
SELECT 'gangnam', 'GRANDSTAND LIVE', NULL, NULL, NULL,
       '주말 18:00 경주를 강남점 GRANDSTAND 대형 화면으로 함께 중계해요. 신청한 분께 응원석을 먼저 안내해 드려요.',
       '이벤트가 시작되면 [참여 신청]을 눌러요.
경주 당일 매장 카운터에서 닉네임을 말해 주세요.',
       '쿠폰이 지급되지 않는 참여 이벤트예요.
중계 일정은 카페 사정에 따라 바뀔 수 있어요.',
       '2026-11-07 00:00:00+09:00', '2026-11-08 23:59:59+09:00', FALSE, NULL, NULL, NULL, TRUE, NULL
WHERE NOT EXISTS (SELECT 1 FROM events WHERE title = 'GRANDSTAND LIVE');

-- 종료 예시 — 노출 허가를 꺼 관리자 화면에만 보인다
INSERT INTO events (branch_id, title, thumbnail, image_hero, image_detail, description, how_to, notes,
                    date_start, date_end, coupon, coupon_amount, capacity, crowded, visible, status)
SELECT 'mapo', 'GRAND OPENING CUP', NULL, NULL, NULL,
       '그랜드 오픈 기념 선착순 50명 쿠폰 이벤트가 끝났어요. 함께 응원해 주셔서 감사합니다.',
       '',
       '종료된 이벤트예요.',
       '2026-10-01 00:00:00+09:00', '2026-10-07 23:59:59+09:00', TRUE, 3, 50, 50, FALSE, NULL
WHERE NOT EXISTS (SELECT 1 FROM events WHERE title = 'GRAND OPENING CUP');
