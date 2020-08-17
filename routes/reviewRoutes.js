//
const express = require('express');
const reviewController = require('./../controllers/reviewController');
const authController = require('./../controllers/authController');

const router = express.Router({ mergeParams: true });

router.use(authController.protect);

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourUserId,
    reviewController.createNewReview
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .delete(
    reviewController.deleteReview,
    authController.restrictTo('user', 'admin')
  )
  .patch(
    reviewController.updateReview,
    authController.restrictTo('user', 'admin')
  );
module.exports = router;
