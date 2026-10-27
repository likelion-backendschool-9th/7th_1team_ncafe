-- E2E 검증 전용 임시 관리자(코드에는 넣지 않는다). 비밀번호: e2e-admin-pass
INSERT INTO members (id, password, role, nickname, coupon_count, lose_streak, join_date, deleted)
VALUES ('e2eadmin', '$2a$10$VTbmHwl4AiDFBpCSdf7d0eq02oiLZ5/KnzWvz4yNe9XQHIL/dmDNO', 'ADMIN', 'E2E관리자', 10, 0, CURRENT_TIMESTAMP, FALSE);
