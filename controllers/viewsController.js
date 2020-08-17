const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');

const catchAsync = require('./../utils/catchAsync');
const AppError = require('../utils/appError');
// const Review = require('../models/reviewModel');
// const User = require('../models/userModel');

exports.getOverview = catchAsync(async (req, res, next) => {
  //1.get tour data from collection
  const tours = await Tour.find();
  //2.Build template

  //3.render that template using tour data from 1
  res.status(200).render('overview', {
    title: 'All Tours',
    tours
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user'
  });
  if (!tour) {
    return next(new AppError('No tour found with that name', 404));
  }

  res.status(200).render('tour', {
    title: `${tour.name} Tour`,
    tour
  });
});

exports.getLoginForm = (req, res) => {
  res.status(200).render('login', {
    title: `Log into your Account`
  });
};

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: `Your Account`
  });
};

exports.getMyTours = catchAsync(async (req, res, next) => {
  //find all bookings
  const bookings = await Booking.find({ user: req.user.id });

  //find tours with the returned id

  const tourIDs = bookings.map(el => el.tour);

  const tours = await Tour.find({ _id: { $in: tourIDs } });

  res.status(200).render('overview', {
    title: `My Tours`,
    tours
  });
});

exports.updateUserData = catchAsync(async (req, res) => {
  console.log('thsi is sjndasndkas', req.body);

  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      name: req.body.name,
      email: req.body.email
    },
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).render('account', {
    title: `Your Account`,
    user: updatedUser
  });
});
