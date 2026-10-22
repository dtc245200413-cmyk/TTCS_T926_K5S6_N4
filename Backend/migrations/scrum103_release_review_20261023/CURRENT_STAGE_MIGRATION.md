# SCRUM-103 Candidate `current_stage` follow-up (review-only)

**Apply order:** the original 005–080 SQL package completes before this independent 090 migration. The 090 SQL does not alter Hiring Decision, Offer, Approval, Submission or Outbox tables.

Original `internal_recruitment_test` had six candidates (`status=NEW` x3, `REJECTED` x3) and no `current_stage`. Blindly adding the legacy default `NEW` would misclassify three rejected candidates. The three SQL statements first add nullable `current_stage`, backfill from `candidates.status` **only for `NEW` and `REJECTED`**, preserving `updated_at`, and then enforce `NOT NULL DEFAULT 'NEW'` for future inserts.

`tools/APPLY_CURRENT_STAGE_TRIAL.cjs` only accepts the isolated MySQL database `internal_recruitment_scrum103_trial`, and checks the exact candidate status distribution and source `.env` before changing schema. It does **not** write to the original/team database. If this tool stops after beginning DDL, do not rerun automatically; inspect the trial database first.

This is not a reusable production migration for arbitrary candidate statuses. Before the DB owner applies 090 to any shared DB, check current column definition, candidate status distribution, backups, schema drift and timestamp retention. If other statuses exist, obtain an approved mapping rather than defaulting to `NEW`. MySQL DDL may commit implicitly.

Migration PASS does not prove HTTP end-to-end (trial has 0 applications and 0 offers). Test verified PASSED decision, explicit approver mandate, atomic approval, publish, candidate acceptance/decline and rollback on an isolated database before calling SCRUM-103 complete.
