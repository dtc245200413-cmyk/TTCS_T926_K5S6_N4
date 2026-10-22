const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offerController');
const { authenticate } = require('../middleware/authMiddleware');

router.get('/', authenticate, offerController.getAllOffers);
router.get('/eligibility', authenticate, offerController.getEligibility);
router.get('/approval-inbox', authenticate, offerController.getApprovalInbox);
router.get('/onboardings', authenticate, offerController.unavailableApprovalExtension);
router.get('/:id', authenticate, offerController.getOfferById);
router.get('/:id/approval-detail', authenticate, offerController.getApprovalDetail);
router.post('/', authenticate, offerController.createDraft);
router.patch('/:id', authenticate, offerController.updateDraft);
router.post('/:id/submit', authenticate, offerController.submitOffer);
// Explicit manager assignment is not an approval; no self/role fallback.
router.post('/:id/assign-approver', authenticate, offerController.assignApprover);
// Secure replacement for legacy non-transactional approval routes.
router.post('/:id/decide-atomic', authenticate, offerController.decideAtomic);
router.post('/:id/approve', authenticate, (req, res, next) => {
  req.body.reason = req.body.reason ?? req.body.note;
  req.body.action = 'APPROVED';
  offerController.processApproval(req, res, next);
});
router.post('/:id/reject', authenticate, (req, res, next) => {
  req.body.action = 'REJECTED';
  offerController.processApproval(req, res, next);
});
router.post('/:id/request-change', authenticate, (req, res, next) => {
  req.body.action = 'REQUEST_CHANGE';
  offerController.processApproval(req, res, next);
});
router.post('/:id/process-approval', authenticate, offerController.processApproval);
router.post('/:id/publish', authenticate, offerController.unavailableApprovalExtension);

module.exports = router;
