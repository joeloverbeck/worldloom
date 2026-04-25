BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS approval_tokens_consumed (
    token_hash TEXT PRIMARY KEY,
    consumed_at TEXT NOT NULL,
    plan_id TEXT NOT NULL
);

COMMIT;
