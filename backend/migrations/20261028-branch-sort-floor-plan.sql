-- Apply once to an existing PostgreSQL database. Development ddl-auto=update creates the column automatically.
-- 지점 순서(sort) 칼럼을 추가하고, 기존 지점의 순서와 비어 있는 평면도를 채운다(branches_data.sql과 같은 값).
-- 관리자가 이미 넣은 평면도는 건드리지 않는다.
BEGIN;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS sort INT NOT NULL DEFAULT 0;
UPDATE branches SET sort = 1 WHERE id = 'mapo';
UPDATE branches SET sort = 2 WHERE id = 'gangnam';
UPDATE branches SET sort = 3 WHERE id = 'seongsu';
UPDATE branches SET sections = '[{"section":"TRACKSIDE","x":3.6,"y":5.7,"w":69.8,"h":21.4},{"section":"GRANDSTAND","x":3.6,"y":29.3,"w":69.8,"h":40.7},{"section":"LOUNGE","x":3.6,"y":73.2,"w":56.4,"h":22.8},{"section":"PADDOCK","x":75.1,"y":5.7,"w":21.3,"h":64.4}]'::jsonb
 WHERE id IN ('mapo', 'gangnam', 'seongsu') AND (sections IS NULL OR sections = '[]'::jsonb);
UPDATE branches SET fixtures = '[{"id":"window","kind":"WINDOW","label":"WINDOW","labelKo":"창가","x":0,"y":0,"w":100,"h":3.4},{"id":"bar","kind":"BAR","label":"BAR","x":89.3,"y":8.3,"w":4.9,"h":58.4},{"id":"counter","kind":"COUNTER","label":"COUNTER","labelKo":"주문","x":61.8,"y":73.2,"w":20.9,"h":22.8},{"id":"restroom","kind":"RESTROOM","label":"RESTROOM","labelKo":"화장실","x":84.4,"y":73.2,"w":12,"h":22.8},{"id":"entrance","kind":"ENTRANCE","label":"ENTRANCE","labelKo":"출입구","x":3.6,"y":97.7,"w":11.5,"h":2.3},{"id":"aisle-h","kind":"AISLE","label":"통로","x":3.6,"y":71.1,"w":92.9,"h":0},{"id":"aisle-v","kind":"AISLE","label":"통로","x":74.2,"y":5.7,"w":0,"h":64.4}]'::jsonb
 WHERE id IN ('mapo', 'gangnam', 'seongsu') AND (fixtures IS NULL OR fixtures = '[]'::jsonb);
COMMIT;
