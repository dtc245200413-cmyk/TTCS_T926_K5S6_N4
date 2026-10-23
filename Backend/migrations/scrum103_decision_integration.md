# SCRUM-103 — Decision integration review

Code reviewed from HEAD `26ef890`. No database was queried or modified in this
work; schema observations below are from source/review SQL, not a new live inventory.

## Implemented

`createVerifiedOfferDecisionTransaction` in `offerDecisionTransaction.js` composes
the existing scope reader/policy, SQL writer and audit writer. The caller provides
a pool and trusted server-side `verifyLifecycle` / `verifyEvaluation` adapters.
There is no default pool import, route registration, startup migration or env switch.
Missing either verifier rejects with 503 before acquiring a connection.

Once both adapters are implemented and reviewed, the sequence is:

1. Validate request identifiers, decision, comment and IP length.
2. Begin transaction; load/lock application, candidate, posting, request, department,
   ACTIVE user and HIRING_MANAGER role assignment using the same connection.
3. Enforce exact department manager identity. ADMIN/HR_MANAGER/RECRUITER do not bypass it.
4. Verify application lifecycle and interview evidence on that connection.
5. Lock/check both application and candidate/request decision uniqueness; insert
   CURRENT decision at row_version 1, exact four scope IDs and policy/reference.
6. Write audit on the same connection; commit only after successful acknowledgement.
   Any failure rolls back and releases the connection. Deadlock/lock timeout/unique
   collision becomes 409; missing table/column becomes sanitized 503. No automatic retry.

Authority reference now retains the verified lifecycle version in addition to
application, lifecycle reference and evaluation reference. This string alone is
NOT evidence of authority and must not enable `verifyDecisionAuthority`.

## Blockers found in current source

| Area | Evidence and minimum agreement required |
| --- | --- |
| Application lifecycle | `database.sql` and `schemaMigrations.js` define status and updated_at but no monotonic lifecycle version. `candidateRepository.updateStatus` updates **all applications of a candidate** to SUBMITTED/SCREENING/INTERVIEWING/OFFERED/HIRED/REJECTED. No state is currently proved to authorize a decision for one application. Application owner must define eligible states and per-application versioned transitions; updated_at is not substituted for a version. |
| Evaluation linkage | Existing `interviewEvaluationRepository` uses interview_schedule_id; schedules have candidate_id but no application binding. Candidate Evaluation uses round_id/candidate_id and a different schema. `candidate_interviews.application_id` exists but no trusted relationship connects those records to either evaluation schema. Evaluation owner must choose the canonical schema and explicit application-bound relationship with consistency constraints. Candidate identity or position equality is insufficient. |
| Evaluation completion | Agree required rounds/reviewers, submitted/completed state, invalidation/version semantics and score scale (existing module uses 5, newer module uses 10). A rating, recommendation or candidate-wide PASSED cannot satisfy this contract. |
| Authority replay | `offerPersistenceDependencies.verifyDecisionAuthority` remains 503. Define how to resolve immutable lifecycle/evaluation references and validate the decision's historical authority/audit, including revocation and manager reassignment semantics. CURRENT plus a policy string is insufficient. |
| Database constraints | Review `010_hiring_decisions.sql.review`: unique application and unique candidate/request, scope FKs, CURRENT/row_version/policy/reference align with writer and offerRepository. UNIQUE candidate/request also blocks a second application for the same request; confirm that restriction and correction/supersession policy. No overwrite is implemented. Schema and lock behavior have NOT been verified against real MySQL in this work. |
| Existing Evaluation route | Teammate decision API still writes candidate-wide summary; its create-Offer API can write PENDING_RESPONSE directly. These have not been replaced. Their owner must approve delegation/restriction before claiming one safe production flow. |
| Submit/approval | Assigned approver proof and notification recipients/identity per submission remain dependencies. No approval rights or Offer write gates changed. |

## Tests and handover

`offerDecisionIntegration.test.js` exercises the real five modules together with
an injected SQL connection and **test-only** lifecycle/evaluation proofs: PASSED
and FAILED, strict scope rejection, missing/wrong-application evidence, duplicate
decision, SQL conflicts/dependency errors, audit failure and rollback. These tests
prove orchestration; they do not prove actual InnoDB locks, foreign keys or rollback.

Validation completed: 23 related Backend suites, 461 tests passed (including
22 new integration cases), zero failures, with the no-MySQL Jest guard. This run
covers Offer, Candidate Portal, Candidate Evaluation, Notification and CORS.
`node --check` passed for all three changed/new JavaScript files; `git diff --check`
passed. Full Backend regression and Frontend build were not run in this change;
no claim is made about their current results.

The composed entry point and regression tests can be reviewed/handed over now.
No production decision route was activated, no real verifier was invented, and
Offer create/update/submit retain their existing 503 gates. Frontend is unchanged.

Acceptance sequence:

1. Application/Evaluation owners approve the explicit relationships, lifecycle and
   version contracts above; preserve existing data with separately reviewed migration.
2. Implement database-backed verifiers on the passed transaction connection, then
   validate authority replay; never take proof objects from an HTTP request.
3. With explicit approval and TEST backup/restore, validate schema and concurrent
   transactions (same application and different applications sharing one request),
   audit failure rollback and revocation on TEST. Do not execute review SQL implicitly.
4. Agree delegation of the existing decision API and restrict the direct-release
   Offer path. Resolve approver assignment and notification delivery dependencies.
5. Review end-to-end security and only then separately authorize opening write gates.
