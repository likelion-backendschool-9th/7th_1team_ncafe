-- 좌석 30자리(테이블 17 + 바석 13 = 의자 71석) 초기 데이터 (프론트 목업이던 값 — /seat 배치도는 이제 이 데이터를 그린다).
-- data.sql이 아니라 자동 실행되지 않는다 — spring.sql.init.data-locations에 classpath:seats_data.sql을 넣어 실행한다.
-- branches_data.sql 다음에 실행한다. 지점 3곳 모두 같은 배치로 넣는다(평면도는 같고 예약 · 수리 중 상태만 지점마다 다르다).
-- 서버를 시작할 때마다 실행되지만 같은 지점 · 좌석 코드가 있으면 넣지 않는다 — 관리자가 켠 수리 중(under_repair)은 그대로 둔다.
-- x, y는 평면도 기준 %(0~100). 위치를 옮기려면 이 값만 고친다(이미 들어간 DB는 seats 행을 고친다).

INSERT INTO seats (branch_id, code, section, type, capacity, x, y, under_repair)
SELECT b.id, v.code, v.section, v.type, v.capacity, v.x, v.y, FALSE
  FROM branches b
 CROSS JOIN (VALUES
       -- TRACKSIDE 창가 좌석 — 창문 바로 아래 한 줄
       ('T01', 'TRACKSIDE',  'TABLE', 2,  8.2, 16.8),
       ('T02', 'TRACKSIDE',  'TABLE', 2, 18.0, 16.8),
       ('T03', 'TRACKSIDE',  'TABLE', 4, 30.4, 16.8),
       ('T04', 'TRACKSIDE',  'TABLE', 2, 42.9, 16.8),
       ('T05', 'TRACKSIDE',  'TABLE', 2, 52.7, 16.8),
       ('T06', 'TRACKSIDE',  'TABLE', 4, 65.1, 16.8),
       -- GRANDSTAND 일반 좌석 — 두 줄
       ('T07', 'GRANDSTAND', 'TABLE', 4, 15.1, 40.5),
       ('T08', 'GRANDSTAND', 'TABLE', 2, 31.6, 40.5),
       ('T09', 'GRANDSTAND', 'TABLE', 2, 45.3, 40.5),
       ('T10', 'GRANDSTAND', 'TABLE', 4, 61.8, 40.5),
       ('T11', 'GRANDSTAND', 'TABLE', 2, 15.1, 59.8),
       ('T12', 'GRANDSTAND', 'TABLE', 2, 28.9, 59.8),
       ('T13', 'GRANDSTAND', 'TABLE', 4, 45.3, 59.8),
       ('T14', 'GRANDSTAND', 'TABLE', 2, 61.8, 59.8),
       -- LOUNGE 단체 좌석 — 아래쪽 한 줄
       ('T15', 'LOUNGE',     'TABLE', 6, 12.0, 84.3),
       ('T16', 'LOUNGE',     'TABLE', 6, 29.6, 84.3),
       ('T17', 'LOUNGE',     'TABLE', 8, 49.3, 84.3),
       -- PADDOCK BAR 바 좌석 — 오른쪽 벽 바 테이블 앞 세로 한 줄
       ('B01', 'PADDOCK',    'BAR',   1, 86.2, 11.4),
       ('B02', 'PADDOCK',    'BAR',   1, 86.2, 15.7),
       ('B03', 'PADDOCK',    'BAR',   1, 86.2, 19.9),
       ('B04', 'PADDOCK',    'BAR',   1, 86.2, 24.2),
       ('B05', 'PADDOCK',    'BAR',   1, 86.2, 28.5),
       ('B06', 'PADDOCK',    'BAR',   1, 86.2, 32.8),
       ('B07', 'PADDOCK',    'BAR',   1, 86.2, 37.0),
       ('B08', 'PADDOCK',    'BAR',   1, 86.2, 41.3),
       ('B09', 'PADDOCK',    'BAR',   1, 86.2, 45.6),
       ('B10', 'PADDOCK',    'BAR',   1, 86.2, 49.9),
       ('B11', 'PADDOCK',    'BAR',   1, 86.2, 54.1),
       ('B12', 'PADDOCK',    'BAR',   1, 86.2, 58.4),
       ('B13', 'PADDOCK',    'BAR',   1, 86.2, 62.7)
       ) AS v(code, section, type, capacity, x, y)
 WHERE b.id IN ('mapo', 'gangnam', 'seongsu')
   AND NOT EXISTS (SELECT 1 FROM seats s WHERE s.branch_id = b.id AND s.code = v.code);

-- 좌석 특징 — 지점마다 같은 코드의 좌석에 붙인다. 이미 있는 특징은 넣지 않는다
INSERT INTO seat_features (seat_id, feature)
SELECT s.id, v.feature
  FROM seats s
  JOIN (VALUES
       ('T01', 'WINDOW'), ('T01', 'OUTLET'),
       ('T02', 'WINDOW'),
       ('T03', 'WINDOW'), ('T03', 'OUTLET'),
       ('T04', 'WINDOW'), ('T04', 'QUIET'),
       ('T05', 'WINDOW'),
       ('T06', 'WINDOW'), ('T06', 'OUTLET'),
       ('T07', 'OUTLET'),
       ('T08', 'QUIET'),
       ('T09', 'QUIET'), ('T09', 'OUTLET'),
       -- T10 · T12는 특징 없음
       ('T11', 'QUIET'),
       ('T13', 'NEAR_COUNTER'),
       ('T14', 'NEAR_COUNTER'), ('T14', 'OUTLET'),
       ('T15', 'GROUP'),
       ('T16', 'GROUP'), ('T16', 'OUTLET'),
       ('T17', 'GROUP'), ('T17', 'OUTLET'),
       -- 바석은 전부 바 · 콘센트, B12 · B13은 카운터 근처
       ('B01', 'BAR'), ('B01', 'OUTLET'),
       ('B02', 'BAR'), ('B02', 'OUTLET'),
       ('B03', 'BAR'), ('B03', 'OUTLET'),
       ('B04', 'BAR'), ('B04', 'OUTLET'),
       ('B05', 'BAR'), ('B05', 'OUTLET'),
       ('B06', 'BAR'), ('B06', 'OUTLET'),
       ('B07', 'BAR'), ('B07', 'OUTLET'),
       ('B08', 'BAR'), ('B08', 'OUTLET'),
       ('B09', 'BAR'), ('B09', 'OUTLET'),
       ('B10', 'BAR'), ('B10', 'OUTLET'),
       ('B11', 'BAR'), ('B11', 'OUTLET'),
       ('B12', 'BAR'), ('B12', 'OUTLET'), ('B12', 'NEAR_COUNTER'),
       ('B13', 'BAR'), ('B13', 'OUTLET'), ('B13', 'NEAR_COUNTER')
       ) AS v(code, feature) ON s.code = v.code
 WHERE s.branch_id IN ('mapo', 'gangnam', 'seongsu')
   AND NOT EXISTS (SELECT 1 FROM seat_features f WHERE f.seat_id = s.id AND f.feature = v.feature);
