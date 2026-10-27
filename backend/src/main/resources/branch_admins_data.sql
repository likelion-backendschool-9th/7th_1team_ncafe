-- H2/local test accounts only. Password: branch-admin-pass. Run after branches_data.sql.
INSERT INTO members (id,password,role,nickname,coupon_count,lose_streak,join_date,deleted)
SELECT 'test_mapo_admin','$2a$10$7zmXM/B.64ICI4l5zqcx1e41A56W3Mfp482Jg4oNktfSaj95/IiX.','BRANCH_ADMIN','mapo admin',0,0,CURRENT_TIMESTAMP,FALSE
WHERE NOT EXISTS (SELECT 1 FROM members WHERE id='test_mapo_admin');
INSERT INTO branch_admins (branch_id,member_no)
SELECT b.id,m.no FROM branches b JOIN members m ON m.id='test_mapo_admin'
WHERE b.id='mapo' AND m.role='BRANCH_ADMIN' AND m.deleted=FALSE
AND NOT EXISTS (SELECT 1 FROM branch_admins a WHERE a.branch_id=b.id AND a.member_no=m.no);

INSERT INTO members (id,password,role,nickname,coupon_count,lose_streak,join_date,deleted)
SELECT 'test_gangnam_admin','$2a$10$7zmXM/B.64ICI4l5zqcx1e41A56W3Mfp482Jg4oNktfSaj95/IiX.','BRANCH_ADMIN','gangnam admin',0,0,CURRENT_TIMESTAMP,FALSE
WHERE NOT EXISTS (SELECT 1 FROM members WHERE id='test_gangnam_admin');
INSERT INTO branch_admins (branch_id,member_no)
SELECT b.id,m.no FROM branches b JOIN members m ON m.id='test_gangnam_admin'
WHERE b.id='gangnam' AND m.role='BRANCH_ADMIN' AND m.deleted=FALSE
AND NOT EXISTS (SELECT 1 FROM branch_admins a WHERE a.branch_id=b.id AND a.member_no=m.no);

INSERT INTO members (id,password,role,nickname,coupon_count,lose_streak,join_date,deleted)
SELECT 'test_seongsu_admin','$2a$10$7zmXM/B.64ICI4l5zqcx1e41A56W3Mfp482Jg4oNktfSaj95/IiX.','BRANCH_ADMIN','seongsu admin',0,0,CURRENT_TIMESTAMP,FALSE
WHERE NOT EXISTS (SELECT 1 FROM members WHERE id='test_seongsu_admin');
INSERT INTO branch_admins (branch_id,member_no)
SELECT b.id,m.no FROM branches b JOIN members m ON m.id='test_seongsu_admin'
WHERE b.id='seongsu' AND m.role='BRANCH_ADMIN' AND m.deleted=FALSE
AND NOT EXISTS (SELECT 1 FROM branch_admins a WHERE a.branch_id=b.id AND a.member_no=m.no);

