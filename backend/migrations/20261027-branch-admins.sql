-- Apply once to an existing PostgreSQL database. Development ddl-auto=update creates this automatically.
BEGIN;
CREATE TABLE branch_admins (
    branch_id VARCHAR(255) NOT NULL REFERENCES branches(id),
    member_no BIGINT NOT NULL REFERENCES members(no),
    PRIMARY KEY (branch_id, member_no)
);
CREATE INDEX branch_admins_member_idx ON branch_admins(member_no);
COMMIT;
