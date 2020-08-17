const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

// const factory = require('./handlerFactory');
// const AppError = require('./../utils/appError');
//

//

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  //a1.get currently booked tour
  const tour = await Tour.findById(req.params.tourId);

  //2.create checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    success_url: `${req.protocol}://${req.get('host')}/?tour=${
      req.params.tourId
    }&user=${req.user.id}&price=${tour.price}`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    line_items: [
      {
        name: `${tour.name} Tour`,
        description: tour.summary,
        images: [`http://localhost:8000/img/tours/${tour.imageCpver}`],
        amount: tour.price * 100,
        currency: 'usd',
        quantity: 1
      }
    ]
  });
  //3.send it to the user

  res.status(200).json({
    status: 'success',
    session
  });
});
exports.createBookingCheckout = catchAsync(async (req, res, next) => {
  //this is a temperory solution, because it is not secure everyone can make booking without paying
  const { tour, user, price } = req.query;
  if (!tour || !user || !price) return next();

  await Booking.create({ tour, user, price });

  res.redirect(req.originalUrl.split('?')[0]);
});

exports.deleteBooking = factory.deleteOne(Booking);
exports.createBooking = factory.createOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.getBooking = factory.getOne(Booking);
exports.updateBooking = factory.updateOne(Booking);
