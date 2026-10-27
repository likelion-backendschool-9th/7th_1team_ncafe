-- 메뉴 · 카테고리 초기 데이터 (프론트 목업 frontend/app/(site)/menu/_data/menus.ts · categories.ts와 같은 값).
-- data.sql이 아니라 자동 실행되지 않는다 — spring.sql.init.data-locations에 classpath:menus_data.sql을 넣어 실행한다.
-- 서버를 시작할 때마다 실행되지만 같은 이름이 있으면 넣지 않는다 — 관리자가 고친 값은 그대로 둔다.
-- id는 지정하지 않는다(관리자 화면에서 추가하는 메뉴 · 카테고리와 겹치지 않게). 서로는 이름으로 찾아 연결한다.
-- 지점별 판매 상태는 branches_data.sql의 지점을 가리키므로 branches_data.sql보다 뒤에 실행한다.
-- 사이즈가 없는 메뉴(디저트)는 사이즈 'F' 하나로 넣는다 — 메뉴판은 S · M · L · XL이 다 있어야 사이즈 메뉴로 본다.
-- 시그니처 메뉴(맨 아래)는 해금 등급이 grades_data.sql의 등급을 가리키므로 grades_data.sql보다 뒤에 실행한다.

-- ── 카테고리 ──
INSERT INTO categories (name_kor, name_eng, sort_order, visible)
SELECT '커피', 'Coffee', 1, TRUE
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name_kor = '커피');

INSERT INTO categories (name_kor, name_eng, sort_order, visible)
SELECT '논커피', 'Non Coffee', 2, TRUE
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name_kor = '논커피');

INSERT INTO categories (name_kor, name_eng, sort_order, visible)
SELECT '티', 'Tea', 3, TRUE
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name_kor = '티');

INSERT INTO categories (name_kor, name_eng, sort_order, visible)
SELECT '디저트', 'Dessert', 4, TRUE
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name_kor = '디저트');

-- ── 메뉴 ──
INSERT INTO menus (category_id, name_kor, name_eng, description, image, label, deleted)
SELECT (SELECT id FROM categories WHERE name_kor = '커피'), '아메리카노', 'Americano', '출발 신호처럼 깔끔한 기본 블렌드', '/images/menus/hot-coffee.svg', 'BEST', FALSE
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name_kor = '아메리카노');

INSERT INTO menus (category_id, name_kor, name_eng, description, image, label, deleted)
SELECT (SELECT id FROM categories WHERE name_kor = '커피'), '아이스 아메리카노', 'Iced Americano', '오늘의 우승 메뉴, 트랙 위의 청량함', '/images/menus/iced-coffee.svg', 'WINNER', FALSE
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name_kor = '아이스 아메리카노');

INSERT INTO menus (category_id, name_kor, name_eng, description, image, label, deleted)
SELECT (SELECT id FROM categories WHERE name_kor = '커피'), '카페 라떼', 'Caffe Latte', 'Latte 처럼 안정적으로 부드러운 한 잔', '/images/menus/latte.svg', 'BEST', FALSE
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name_kor = '카페 라떼');

INSERT INTO menus (category_id, name_kor, name_eng, description, image, label, deleted)
SELECT (SELECT id FROM categories WHERE name_kor = '커피'), '바닐라 라떼', 'Vanilla Latte', '느긋하지만 꾸준한 달콤함', '/images/menus/latte.svg', NULL, FALSE
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name_kor = '바닐라 라떼');

INSERT INTO menus (category_id, name_kor, name_eng, description, image, label, deleted)
SELECT (SELECT id FROM categories WHERE name_kor = '커피'), '카라멜 마키아토', 'Caramel Macchiato', '올라운더 Caramel 의 시그니처', '/images/menus/latte.svg', 'NEW', FALSE
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name_kor = '카라멜 마키아토');

INSERT INTO menus (category_id, name_kor, name_eng, description, image, label, deleted)
SELECT (SELECT id FROM categories WHERE name_kor = '커피'), '에스프레소', 'Espresso', '짧고 강하게, 한 모금의 승부', '/images/menus/hot-coffee.svg', NULL, FALSE
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name_kor = '에스프레소');

INSERT INTO menus (category_id, name_kor, name_eng, description, image, label, deleted)
SELECT (SELECT id FROM categories WHERE name_kor = '논커피'), '초코 라떼', 'Chocolate Latte', '막판 스퍼트가 필요한 날의 진한 초코', '/images/menus/chocolate.svg', NULL, FALSE
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name_kor = '초코 라떼');

INSERT INTO menus (category_id, name_kor, name_eng, description, image, label, deleted)
SELECT (SELECT id FROM categories WHERE name_kor = '논커피'), '딸기 스무디', 'Strawberry Smoothie', '제철 딸기를 통째로 갈아 넣은 스무디', '/images/menus/smoothie.svg', NULL, FALSE
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name_kor = '딸기 스무디');

INSERT INTO menus (category_id, name_kor, name_eng, description, image, label, deleted)
SELECT (SELECT id FROM categories WHERE name_kor = '논커피'), '레몬에이드', 'Lemonade', '결승선을 통과한 듯 상쾌한 탄산', '/images/menus/lemonade.svg', NULL, FALSE
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name_kor = '레몬에이드');

INSERT INTO menus (category_id, name_kor, name_eng, description, image, label, deleted)
SELECT (SELECT id FROM categories WHERE name_kor = '티'), '얼그레이', 'Earl Grey', '클래식 스포츠 클럽의 오후 홍차', '/images/menus/tea.svg', NULL, FALSE
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name_kor = '얼그레이');

INSERT INTO menus (category_id, name_kor, name_eng, description, image, label, deleted)
SELECT (SELECT id FROM categories WHERE name_kor = '티'), '캐모마일', 'Chamomile', '경기 후 마음을 가라앉히는 허브티', '/images/menus/tea.svg', NULL, FALSE
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name_kor = '캐모마일');

INSERT INTO menus (category_id, name_kor, name_eng, description, image, label, deleted)
SELECT (SELECT id FROM categories WHERE name_kor = '티'), '말차 라떼', 'Matcha Latte', '잔디 트랙을 닮은 진한 녹차', '/images/menus/matcha.svg', 'BEST', FALSE
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name_kor = '말차 라떼');

INSERT INTO menus (category_id, name_kor, name_eng, description, image, label, deleted)
SELECT (SELECT id FROM categories WHERE name_kor = '디저트'), '당근 케이크', 'Carrot Cake', '말들이 가장 좋아하는 당근으로 만든 케이크', '/images/menus/cake.svg', 'BEST', FALSE
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name_kor = '당근 케이크');

INSERT INTO menus (category_id, name_kor, name_eng, description, image, label, deleted)
SELECT (SELECT id FROM categories WHERE name_kor = '디저트'), '말발굽 쿠키', 'Horseshoe Cookie', '행운을 부르는 말발굽 모양 버터 쿠키', '/images/menus/cookie.svg', 'NEW', FALSE
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name_kor = '말발굽 쿠키');

INSERT INTO menus (category_id, name_kor, name_eng, description, image, label, deleted)
SELECT (SELECT id FROM categories WHERE name_kor = '디저트'), '치즈케이크', 'Cheesecake', '시즌 오프로 잠시 쉬어 가는 메뉴', '/images/menus/cake.svg', NULL, FALSE
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name_kor = '치즈케이크');

-- ── 메뉴 사이즈 · 가격 ──
INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '아메리카노'), 4000, 'S'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '아메리카노' AND TRIM(s.size) = 'S');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '아메리카노'), 4500, 'M'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '아메리카노' AND TRIM(s.size) = 'M');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '아메리카노'), 5000, 'L'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '아메리카노' AND TRIM(s.size) = 'L');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '아메리카노'), 5500, 'XL'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '아메리카노' AND TRIM(s.size) = 'XL');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '아이스 아메리카노'), 4500, 'S'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '아이스 아메리카노' AND TRIM(s.size) = 'S');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '아이스 아메리카노'), 5000, 'M'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '아이스 아메리카노' AND TRIM(s.size) = 'M');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '아이스 아메리카노'), 5500, 'L'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '아이스 아메리카노' AND TRIM(s.size) = 'L');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '아이스 아메리카노'), 6000, 'XL'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '아이스 아메리카노' AND TRIM(s.size) = 'XL');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '카페 라떼'), 5000, 'S'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '카페 라떼' AND TRIM(s.size) = 'S');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '카페 라떼'), 5500, 'M'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '카페 라떼' AND TRIM(s.size) = 'M');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '카페 라떼'), 6000, 'L'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '카페 라떼' AND TRIM(s.size) = 'L');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '카페 라떼'), 6800, 'XL'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '카페 라떼' AND TRIM(s.size) = 'XL');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '바닐라 라떼'), 5500, 'S'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '바닐라 라떼' AND TRIM(s.size) = 'S');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '바닐라 라떼'), 6000, 'M'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '바닐라 라떼' AND TRIM(s.size) = 'M');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '바닐라 라떼'), 6500, 'L'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '바닐라 라떼' AND TRIM(s.size) = 'L');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '바닐라 라떼'), 7300, 'XL'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '바닐라 라떼' AND TRIM(s.size) = 'XL');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '카라멜 마키아토'), 5800, 'S'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '카라멜 마키아토' AND TRIM(s.size) = 'S');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '카라멜 마키아토'), 6300, 'M'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '카라멜 마키아토' AND TRIM(s.size) = 'M');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '카라멜 마키아토'), 6800, 'L'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '카라멜 마키아토' AND TRIM(s.size) = 'L');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '카라멜 마키아토'), 7600, 'XL'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '카라멜 마키아토' AND TRIM(s.size) = 'XL');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '에스프레소'), 3500, 'S'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '에스프레소' AND TRIM(s.size) = 'S');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '에스프레소'), 4000, 'M'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '에스프레소' AND TRIM(s.size) = 'M');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '에스프레소'), 4500, 'L'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '에스프레소' AND TRIM(s.size) = 'L');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '에스프레소'), 5000, 'XL'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '에스프레소' AND TRIM(s.size) = 'XL');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '초코 라떼'), 5500, 'S'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '초코 라떼' AND TRIM(s.size) = 'S');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '초코 라떼'), 6000, 'M'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '초코 라떼' AND TRIM(s.size) = 'M');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '초코 라떼'), 6500, 'L'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '초코 라떼' AND TRIM(s.size) = 'L');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '초코 라떼'), 7300, 'XL'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '초코 라떼' AND TRIM(s.size) = 'XL');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '딸기 스무디'), 6000, 'S'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '딸기 스무디' AND TRIM(s.size) = 'S');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '딸기 스무디'), 6500, 'M'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '딸기 스무디' AND TRIM(s.size) = 'M');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '딸기 스무디'), 7000, 'L'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '딸기 스무디' AND TRIM(s.size) = 'L');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '딸기 스무디'), 7800, 'XL'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '딸기 스무디' AND TRIM(s.size) = 'XL');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '레몬에이드'), 5500, 'S'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '레몬에이드' AND TRIM(s.size) = 'S');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '레몬에이드'), 6000, 'M'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '레몬에이드' AND TRIM(s.size) = 'M');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '레몬에이드'), 6500, 'L'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '레몬에이드' AND TRIM(s.size) = 'L');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '레몬에이드'), 7300, 'XL'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '레몬에이드' AND TRIM(s.size) = 'XL');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '얼그레이'), 4800, 'S'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '얼그레이' AND TRIM(s.size) = 'S');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '얼그레이'), 5300, 'M'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '얼그레이' AND TRIM(s.size) = 'M');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '얼그레이'), 5800, 'L'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '얼그레이' AND TRIM(s.size) = 'L');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '얼그레이'), 6300, 'XL'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '얼그레이' AND TRIM(s.size) = 'XL');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '캐모마일'), 4800, 'S'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '캐모마일' AND TRIM(s.size) = 'S');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '캐모마일'), 5300, 'M'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '캐모마일' AND TRIM(s.size) = 'M');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '캐모마일'), 5800, 'L'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '캐모마일' AND TRIM(s.size) = 'L');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '캐모마일'), 6300, 'XL'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '캐모마일' AND TRIM(s.size) = 'XL');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '말차 라떼'), 5800, 'S'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '말차 라떼' AND TRIM(s.size) = 'S');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '말차 라떼'), 6300, 'M'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '말차 라떼' AND TRIM(s.size) = 'M');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '말차 라떼'), 6800, 'L'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '말차 라떼' AND TRIM(s.size) = 'L');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '말차 라떼'), 7600, 'XL'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '말차 라떼' AND TRIM(s.size) = 'XL');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '당근 케이크'), 6500, 'F'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '당근 케이크' AND TRIM(s.size) = 'F');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '말발굽 쿠키'), 3000, 'F'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '말발굽 쿠키' AND TRIM(s.size) = 'F');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '치즈케이크'), 6000, 'F'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '치즈케이크' AND TRIM(s.size) = 'F');

-- ── 지점별 판매 상태 ──
-- 목업의 품절 · 숨김 메뉴를 강남점에 둔다(관리자 화면 · 메뉴판 지점 선택 확인용). 나머지 지점 · 메뉴는 행이 없어 판매 중이다.
INSERT INTO menus_available (branch_id, menu_id, status)
SELECT 'gangnam', (SELECT id FROM menus WHERE name_kor = '딸기 스무디'), 'SOLD_OUT'
WHERE EXISTS (SELECT 1 FROM branches WHERE id = 'gangnam')
  AND NOT EXISTS (SELECT 1 FROM menus_available a JOIN menus mm ON mm.id = a.menu_id WHERE a.branch_id = 'gangnam' AND mm.name_kor = '딸기 스무디');

INSERT INTO menus_available (branch_id, menu_id, status)
SELECT 'gangnam', (SELECT id FROM menus WHERE name_kor = '치즈케이크'), 'HIDDEN'
WHERE EXISTS (SELECT 1 FROM branches WHERE id = 'gangnam')
  AND NOT EXISTS (SELECT 1 FROM menus_available a JOIN menus mm ON mm.id = a.menu_id WHERE a.branch_id = 'gangnam' AND mm.name_kor = '치즈케이크');

-- ── 시그니처 메뉴 (해금) ──
-- 누적 쿠폰으로 오르는 등급마다 하나씩 열린다(신마 0 · 준마 10 · 명마 25 · 전설마 40). 메뉴판에는 잠금 표시로 보이고, 등급이 되면 주문할 수 있다.

INSERT INTO menus (category_id, name_kor, name_eng, description, image, label, deleted, required_grade_id)
SELECT (SELECT id FROM categories WHERE name_kor = '커피'), '위너스 서클 라떼', 'Winner''s Circle Latte', '우승마만 서는 자리처럼, 꿀과 시나몬을 더한 축하 라떼', '/images/menus/latte.svg', NULL, FALSE,
       (SELECT id FROM grade WHERE name = '준마')
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name_kor = '위너스 서클 라떼');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '위너스 서클 라떼'), 5900, 'S'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '위너스 서클 라떼' AND TRIM(s.size) = 'S');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '위너스 서클 라떼'), 6400, 'M'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '위너스 서클 라떼' AND TRIM(s.size) = 'M');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '위너스 서클 라떼'), 6900, 'L'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '위너스 서클 라떼' AND TRIM(s.size) = 'L');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '위너스 서클 라떼'), 7700, 'XL'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '위너스 서클 라떼' AND TRIM(s.size) = 'XL');

INSERT INTO menus (category_id, name_kor, name_eng, description, image, label, deleted, required_grade_id)
SELECT (SELECT id FROM categories WHERE name_kor = '커피'), '더비 나이트 콜드브루', 'Derby Night Cold Brew', '밤 경주처럼 깊고 진한 18시간 콜드브루에 바닐라 크림', '/images/menus/iced-coffee.svg', NULL, FALSE,
       (SELECT id FROM grade WHERE name = '명마')
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name_kor = '더비 나이트 콜드브루');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '더비 나이트 콜드브루'), 6500, 'S'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '더비 나이트 콜드브루' AND TRIM(s.size) = 'S');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '더비 나이트 콜드브루'), 7000, 'M'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '더비 나이트 콜드브루' AND TRIM(s.size) = 'M');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '더비 나이트 콜드브루'), 7500, 'L'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '더비 나이트 콜드브루' AND TRIM(s.size) = 'L');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '더비 나이트 콜드브루'), 8300, 'XL'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '더비 나이트 콜드브루' AND TRIM(s.size) = 'XL');

INSERT INTO menus (category_id, name_kor, name_eng, description, image, label, deleted, required_grade_id)
SELECT (SELECT id FROM categories WHERE name_kor = '디저트'), '트리플 크라운 케이크', 'Triple Crown Cake', '초콜릿 · 캐러멜 · 크림 세 겹, 전설마에게만 열리는 케이크', '/images/menus/cake.svg', NULL, FALSE,
       (SELECT id FROM grade WHERE name = '전설마')
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name_kor = '트리플 크라운 케이크');

INSERT INTO menus_size (menu_id, price, size)
SELECT (SELECT id FROM menus WHERE name_kor = '트리플 크라운 케이크'), 8500, 'F'
WHERE NOT EXISTS (SELECT 1 FROM menus_size s JOIN menus mm ON mm.id = s.menu_id WHERE mm.name_kor = '트리플 크라운 케이크' AND TRIM(s.size) = 'F');
