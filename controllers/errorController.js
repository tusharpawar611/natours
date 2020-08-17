const AppError = require('./../utils/appError');

const handleCastErrorDB = err => {
  const message = `invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};
const handleDuplicateFieldsDB = err => {
  // const value = err.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/);
  // console.log(value);
  const message = `Duplicate Field Value: ${
    err.keyValue
  }:please Use another value`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `invalid input data ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid Token please Login Again', 401);

const handleJWTExpiredError = () =>
  new AppError('your Token has Expired! Please Login Again', 401);

const sendErrorDev = (err, req, res) => {
  //Trusted Error
  //api
  if (req.originalUrl.startsWith('/api')) {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  }
  //rendered website
  else {
    res.status(err.statusCode).render('error', {
      title: 'something went wrong',
      msg: err.message
    });
  }
};

const sendErrorProd = (err, req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message
        // stack: err.stack
      });
    }
    //Programming or other unknown error: so dont leak to the client

    //log error

    return res.status(500).json({
      status: 'error',
      message: 'Something went Wrong'
    });
  }
  //
  // eslint-disable-next-line no-lonely-if
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'something went wrong',
      msg: err.message
    });
  }
  //Programming or other unknown error: so dont leak to the client

  //log error
  return res.status(err.statusCode).render('error', {
    title: 'something went wrong',
    msg: 'Please try again later'
  });
};
module.exports = (err, req, res, next) => {
  // console.log('stack Trace -------------------:');
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;

    if (error.kind === 'ObjectId') {
      error = handleCastErrorDB(error);
    }
    if (error.name === 'MongoError') {
      error = handleDuplicateFieldsDB(error);
    }
    if (error._message === 'Tour validation failed') {
      error = handleValidationErrorDB(error);
    }
    if (error.name === 'JsonWebTokenError') {
      error = handleJWTError(error);
    }
    if (error.name === 'TokenExpiredError') {
      error = handleJWTExpiredError(error);
    }
    sendErrorProd(error, req, res);
  }
};
