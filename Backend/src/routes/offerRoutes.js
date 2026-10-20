const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offerController');
const { authenticate } = require('../middleware/authMiddleware');

router.get('/', authenticate, offerController.getAllOffers);
router.get('/:id', authenticate, offerController.getOfferById);
router.post('/', authenticate, offerController.createDraft);
router.patch('/:id', authenticate, offerController.updateDraft);
router.post('/:id/submit', authenticate, offerController.submitOffer);
router.post('/:id/approve', authenticate, (req, res, next) => {
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

module.exports = router;
