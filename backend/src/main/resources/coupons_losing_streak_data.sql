-- 연패 위로 쿠폰 정책 초기 데이터 (행은 1개). 기본값: 3연패 이상 · 쿠폰 0장이면 마지막 경주 정산 10분 뒤 1장, 사용.
-- data.sql이 아니라 자동 실행되지 않는다 — spring.sql.init.data-locations에 classpath:coupons_losing_streak_data.sql을 넣어 실행한다.
-- 행이 없어도 CouponService가 같은 기본값으로 동작하고, 관리자 쿠폰 관리(/admin/coupons)에서 처음 저장할 때 행이 생긴다.
-- 관리자가 바꾼 값은 그대로 둔다.
INSERT INTO coupons_losing_streak (id, lose_streak, coupons, delay_minutes, enabled, updated_time)
SELECT 1, 3, 1, 10, TRUE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM coupons_losing_streak WHERE id = 1);
