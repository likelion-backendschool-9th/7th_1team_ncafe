-- 출전마 7마리 초기 데이터 (프론트 목업 frontend/app/(site)/race/_data/horses.ts와 같은 값).
-- data.sql이 아니라 자동 실행되지 않는다 — spring.sql.init.data-locations에 classpath:horses_data.sql을 넣어 실행한다.
-- 서버를 시작할 때마다 실행되지만 같은 id가 있으면 넣지 않는다 — 관리자가 고친 값은 그대로 둔다.
-- 말 id(1~7)는 경주 기록 · 경기 화면이 가리키므로 고정한다. 등록 · 삭제 API는 없다(7마리 고정).
INSERT INTO horses (id, name_kor, name_eng, color, color_name, image, personality, trait, description)
SELECT 1, '썬더', 'Thunder', '#245296', '파랑', '/images/horses/thunder.png', '성격 급한 에너자이저', 'FAST_START',
       '게이트가 열리자마자 튀어 나가는, 초반 스타트가 빠른 흑마'
WHERE NOT EXISTS (SELECT 1 FROM horses WHERE id = 1);

INSERT INTO horses (id, name_kor, name_eng, color, color_name, image, personality, trait, description)
SELECT 2, '라떼', 'Latte', '#359b9d', '청록', '/images/horses/latte.png', '차분한 모범생', 'STEADY',
       '처음부터 끝까지 같은 속도로, 안정적으로 달리는 말'
WHERE NOT EXISTS (SELECT 1 FROM horses WHERE id = 2);

INSERT INTO horses (id, name_kor, name_eng, color, color_name, image, personality, trait, description)
SELECT 3, '모카', 'Mocha', '#22633c', '초록', '/images/horses/mocha.png', '느긋하다 마지막에 폭발', 'LATE_SPURT',
       '뒤에서 기다리다 마지막 직선에서 치고 나오는, 막판 스퍼트가 강한 말'
WHERE NOT EXISTS (SELECT 1 FROM horses WHERE id = 3);

INSERT INTO horses (id, name_kor, name_eng, color, color_name, image, personality, trait, description)
SELECT 4, '에스프레소', 'Espresso', '#de550b', '주황', '/images/horses/espresso.png', '짧고 굵은 승부사', 'FAST_START',
       '짧고 강하게 치고 나가지만 지구력은 약한 말'
WHERE NOT EXISTS (SELECT 1 FROM horses WHERE id = 4);

INSERT INTO horses (id, name_kor, name_eng, color, color_name, image, personality, trait, description)
SELECT 5, '캐러멜', 'Caramel', '#f0b22d', '노랑', '/images/horses/caramel.png', '뭐든 무난한 올라운더', 'BALANCED',
       '어느 구간에서도 크게 처지지 않는 무난한 올라운더'
WHERE NOT EXISTS (SELECT 1 FROM horses WHERE id = 5);

INSERT INTO horses (id, name_kor, name_eng, color, color_name, image, personality, trait, description)
SELECT 6, '바닐라', 'Vanilla', '#eb526e', '분홍', '/images/horses/vanilla.png', '느긋한 산책가', 'STEADY',
       '서두르지 않지만 꾸준히 따라붙는 말'
WHERE NOT EXISTS (SELECT 1 FROM horses WHERE id = 6);

INSERT INTO horses (id, name_kor, name_eng, color, color_name, image, personality, trait, description)
SELECT 7, '쿠키', 'Cookie', '#e4362f', '빨강', '/images/horses/cookie.png', '기분파 장난꾸러기', 'WILDCARD',
       '그날 기분에 따라 1등도 꼴찌도 하는, 변수가 많은 말'
WHERE NOT EXISTS (SELECT 1 FROM horses WHERE id = 7);
