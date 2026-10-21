/**
 * offerRoutes.js
 * Quản lý tuyến đường cho Phê duyệt và Phát hành Offer
 */

const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offerController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

// Danh sách & chi tiết Offer
router.get('/', offerController.getOffers);
router.get('/onboardings', offerController.getOnboardings);
router.get('/:id', offerController.getOfferById);

// Thao tác duyệt của Người duyệt
router.post('/:id/approve', offerController.approveOffer);
router.post('/:id/reject', offerController.rejectOffer);
router.post('/:id/request-change', offerController.requestChangeOffer);

// Thao tác phát hành của Recruiter
router.post('/:id/publish', offerController.publishOffer);

module.exports = router;
