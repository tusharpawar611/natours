const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const globalErrorHandler = require('./controllers/errorController');
const AppError = require('./utils/appError');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

//start express app
const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

// 1)GLOBAL MIDDLEWARES
//SET SECURITY HTTP HEADER
// app.use(helmet());
// app.use(
//   helmet.contentSecurityPolicy({
//     directives: {
//       defaultSrc: ["'self'", 'http://localhost:8000/*'],
//       baseUri: ["'self'"],
//       fontSrc: ["'self'", 'https:', 'data:'],
//       scriptSrc: ["'self'", 'https://*.cloudflare.com'],
//       scriptSrc: [
//         "'self'",
//         'https://*.stripe.com',
//         'https://cdnjs.cloudflare.com/ajax/libs/axios/0.18.0/axios.min.js'
//       ],
//       frameSrc: ["'self'", 'https://*.stripe.com'],
//       objectSrc: ["'none'"],
//       styleSrc: ["'self'", 'https:', 'unsafe-inline'],
//       upgradeInsecureRequests: []
//     }
//   })
// );

//DEVELOPMENT LOGGING
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

//LIMIT RESPONSE FOR SAME API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'too many request from this ip, please try again in an hour'
});
app.use('/api', limiter);

//BODY PARSER, READING DATA FROM BODY INTO REQ.BODY
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

//DATA SANITIZATION AGAINST NoSql query injection
app.use(mongoSanitize());
//DATA SANITIZATION AGAINST XSS
app.use(xss());

//PREVENT PARAMETER POLLUTION
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsAverage',
      'ratingQuantity',
      'maxGroupSize',
      'difficulty',
      'price'
    ]
  })
);
//SERVING STATIC FILES

// app.use((req, res, next) => {
//   console.log('Hello from the middleware 👋');
//   next();
// });
//TEST MIDDLEWARE
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

// 3) ROUTES
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`cant find ${req.originalUrl} on this server`, 404));
});
app.use(globalErrorHandler);

module.exports = app;
