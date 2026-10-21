# SCRUM-382 — persistence review, phase 5.2A / 5.2C

Current TEST deployment proposal: [ordered 5.2C review pack](scrum382_test_review/README.md).
The 5.2A catalogue below is historical; do not deploy its alternative branches.
5.2B verified a legacy Offer table with 11 columns, application_id NOT NULL UNIQUE,
no Offer FK, and no decision/approval/submission/assignment tables. The new pack
adds exactly 21 Offer columns, preserves legacy defaults and includes offer_approvals.
Eligibility now reads application-bound candidate_hiring_decisions with explicit
candidate/request/department matches and CURRENT/not-revoked/not-superseded checks.
Its existing interview_* DTO names are aliases, not reads of candidates summaries.
No positive eligibility or write gate is enabled. application_code has a separate
Portal/Application dependency step; Evaluation summary columns are optional and
are not a dependency of Offer eligibility. Authority and assignment ports remain 503.
The remaining sections retain the original design and integration rationale;
the ordered pack takes precedence for schema-specific deployment instructions.

This document and `scrum382_offer_drafts.sql.draft` describe a proposed contract.
No database was inspected or modified. The SQL catalogue is **not an executable
migration**: choose missing/existing-table branches and individual statements
after inventory. It is not imported by the application. Write and approval gates
remain closed; applying DDL alone does not authorize activation.

## Existing schemas and compatibility

`schemaMigrations.js` creates a legacy `candidate_offers` with
`application_id INT NOT NULL UNIQUE`, `salary_amount`, `start_date` and public
status default `PENDING_RESPONSE`. `database.sql` defines the richer Offer schema
with nullable application, required draft content, and no application UNIQUE.
Neither source proves what has actually been deployed. Keep every existing
UNIQUE; add exact UNIQUE(application_id) only if absent after duplicate checks.
Any status, including REJECTED/DECLINED/CANCELLED, blocks another Offer for that
application. An unmapped legacy Offer for the candidate also blocks creation.

Missing anchors are added nullable to preserve historical rows. Existing NOT NULL
anchors remain. New writes require real application/candidate/request/department
and creator relationships. Content position/title/salary/start/deadline may be
NULL in drafts; sending still requires them. The position must match the request.
Currency remains required with its existing default.

New draft inserts write `basic_salary` and `salary_amount`, and
`expected_start_date` and `start_date`, together. PATCH mirrors only fields
explicitly changed; omitted values and old rows are untouched. No COALESCE-based
backfill, status conversion, or fabricated dates/IDs is used. Existing divergent
pairs require human review before editing/publishing those rows.
Portal continues to read legacy columns, its application ownership JOIN and only
PENDING_RESPONSE/ACCEPTED/DECLINED. No publication operation is implemented here.

## Decision contract and minimal candidateEvaluation change

The dedicated `candidate_hiring_decisions` gains nullable application binding,
row_version, validity_status (default UNVERIFIED), authority_policy/reference,
revoked_at and superseded_at. Existing candidate/request UNIQUE stays intact.
This deliberately blocks a second application sharing that pair until the team
reviews how to retain decision history. Do not silently rebind an existing row.

The persistence reader locks the exact application/candidate/request/department
decision, requires CURRENT, no revocation/supersession, PASSED, actor/time/version,
and calls `verifyDecisionAuthority` on the same transaction. That verifier is an
explicit **unimplemented 503 dependency**. A CURRENT marker, actor ID, or a role
alone is not evidence of scoped authority. No runtime client may supply this
proof. Existing eligibility remains conservative and does not claim eligible=true.

Proposed minimal work for the Evaluation owner, not implemented in their module:

1. Make `recordDecision` accept a selected real application ID; load/lock its
   candidate, posting, request and department. Never infer it from candidate ID,
   even when only one application exists. Manual candidates need a real application.
2. Confirm a versioned decision-authority policy using actual role codes plus
   verified scope. Existing broad HR/Hiring Manager checks are not sufficient
   evidence of the intended policy. Specify what happens on manager/role changes.
3. Write the dedicated decision and authority policy/reference in one transaction
   with the existing candidate summary and audit log. Increment decision version
   for changes/revocation. Serialize on the application, preserve audit evidence,
   and never manufacture/backfill PASSED from the candidate summary.
4. Implement `verifyDecisionAuthority(decision, application, conn)` against that
   real audit/assignment relation; return true only after verifying actor/time,
   policy/reference and scope. Add runtime eligibility reading through the same
   contract once schema and writer are deployed. The existing candidate summary
   becomes a display projection, never a fallback proof.

Corresponding acceptance cases for the future writer: reject absent/mismatched
application, unauthorized actor and out-of-department scope; atomically persist
PASSED and FAILED with correct actor/time/version/audit; rollback both summary
and decision on audit failure; invalidate a previous PASSED on FAILED/revocation;
refuse application rebinding and candidate/request UNIQUE collisions; serialize
concurrent decisions. Reader rejection tests for these invalid proofs are included
in `offerPersistence.test.js`; no claim is made that the future writer is tested.

## Transactions, versioning and assignments

Creation locks the application before checking decisions/duplicates and inserting.
The database UNIQUE is the final defense, including competing/legacy writers.
PATCH retains creator/verified department scope even if the primary recruiter is
reassigned; creating a new Offer still requires the primary recruiter relation.
The conditional UPDATE includes scope, editable status and expected row_version,
increments the version, and reads the persisted row on the same connection.
Submit locks the Offer, rechecks decision/content/duplicates, advances its version,
and inserts history plus concrete assignments in the same transaction.
All errors roll back and release. Duplicate/deadlock/lock-timeout errors become
generic 409 responses. No transparent retry is used. Creation locks application
first while edit/submit locks Offer first; contention can deadlock and is safely
rolled back. Real two-connection MySQL tests are required before activation.

Each `offer_submissions` row has (offer_id, submission_number) and
(offer_id, offer_row_version) UNIQUE, submitter/time and immutable decision/content
snapshots. Each `offer_submission_assignments` row has one specific approver,
assigner/time, assignment source/reference/version and optional revoked_at.
`offer_approvals` is left unchanged and is not an assignment source.

`resolveSubmissionAssignments(offer, user, decision, conn)` remains a **503 port**.
SCRUM-390/391 must supply a trusted workflow resolver returning
`{ verified: true, offer_id, application_id, source, reference, version,
assigned_by, approver_ids }` after checking the actual assignment policy and its
version in the transaction. HTTP draft payloads cannot set these values. The
repository also checks active recipient accounts; that check does not grant
approval permission. History/assignment failure rolls back the status transition.

Approval authorization/processing must later use the latest submission's active
assignments, lock/version-check before acting, and increment Offer row_version.
The existing approval gate is unchanged here. Notification code is unchanged:
its broad role recipients, salary-bearing text and `/offers` deduplication key
are blockers for activation. Coordinate per-assignment recipients and a stable
per-submission identity (e.g. `/offers/{id}?submission={submissionId}`), with
post-commit delivery/retry or an agreed outbox, without rewriting teammate logic
in this phase. No notification is emitted when the transaction fails.

## The other creation path is still a blocker

Evaluation `POST /api/candidate-evaluations/:id/offer` still calls
`createCandidateOffer` and writes PENDING_RESPONSE without application binding or
this gate. Its frontend detail page still calls it; candidate status PASSED is
still accepted there. The owner must disable/delegate that endpoint to the same
Offer draft service and replace its UI action with eligibility + OfferForm,
preserving agreed response compatibility. Remove its candidate.status fallback
and direct OFFERED/PENDING_RESPONSE writes as a coordinated change. Evaluation
list/detail salary reads also need the Offer scope/public-state policy before
real drafts exist. None of these Evaluation behaviors was changed in 5.2A.

## Checklist for a separately approved internal_recruitment_test session

1. Keep Backend stopped and write gates closed. Obtain explicit approval for DB
   access/migration. Verify SELECT DATABASE() is exactly internal_recruitment_test;
   use a dedicated account restricted to that database. Never import database.sql.
2. Take and verify a restorable backup; inventory server version, InnoDB, SQL mode,
   SHOW CREATE TABLE, column types/defaults/nullability, indexes and FK actions.
   Inventory both interview_evaluations variants separately: the dormant Evaluation
   migration still has no schema compatibility strategy and must not be activated.
3. Run read-only duplicate/orphan/mapping/legacy-pair checks. Inventory every
   proposed FK's non-NULL orphans and all existing history. Stop on incompatibility;
   do not delete, manufacture mappings/decisions, or disable FK checks to proceed.
4. Assemble and review an ordered migration from the catalogue, choosing exactly
   one branch per table. Skip identical columns/constraints by definition, not name;
   stop on incompatible definitions or existing history tables. Preserve defaults
   and comments when relaxing only draft content nullability. Existing cascading
   FKs require a separate retention review, not an automatic replacement.
5. Apply only that approved incremental script, recording each step and its result.
   DDL is not transactionally rolled back; resume via inventory, never blind rerun.
6. Compare before/after counts, IDs, salaries, dates, statuses, histories and index
   definitions. No legacy row values should change (new version/default metadata
   excepted). Test a restore procedure on a disposable copy.
7. Run isolated DB integration tests: two concurrent creates for one application,
   stale PATCH, simultaneous submit, repeated history, assignment failure rollback,
   FAILED/revoked/rebound decision, no notification before commit, and Portal
   isolation. Current Jest tests use mock connections; they do not prove InnoDB DDL
   syntax, locks, FK enforcement, JSON behavior or migration safety.
8. Deploy/verify the application-bound decision writer, authority verifier, workflow
   assignment resolver, assignment-based approval/read scope, notification contract
   and retirement of direct Evaluation creation. Then review readiness separately;
   do not remove the 503 gate solely because migration or tests passed.
