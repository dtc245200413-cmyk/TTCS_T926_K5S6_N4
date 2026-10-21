const validation = require('../services/offerValidation');

// Deliberately unresolved integration ports. Neither HTTP input, an environment
// flag, role membership nor historical offer_approvals can satisfy these proofs.
// See migrations/scrum382_offer_persistence_review.md before implementing them.
async function verifyDecisionAuthority(decision, application, conn) {
  validation.dependencyUnavailable();
}

async function resolveSubmissionAssignments(offer, user, decision, conn) {
  validation.dependencyUnavailable();
}

module.exports = { verifyDecisionAuthority, resolveSubmissionAssignments };
