const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');

const catchAsync = require('./../utils/catchAsync');

const AppError = require('./../utils/appError');

const Email = require('./../utils/email');

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);
  //remove the password from output
  user.password = undefined;
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);
  const url = `${req.protocol}://${req.get('host')}/me`;
  console.log(url);
  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 200, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //check if email and pass exist
  if (!email || !password) {
    return next(new AppError('Pleasae Provide Email and Password', 400));
  }
  // check if user exist and pass is correst

  const user = await User.findOne({ email }).select('+password');
  console.log(user);
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect Email or Password', 401));
  }

  // const user = await User.findOne({ email }).select('+password');

  // if (!user || !(await user.correctPassword(password, user.password))) {
  //   return next(new AppError('Incorrect email or password', 401));
  // }
  // if everything os send token to client

  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedOut', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ status: 'success' });
};
//1.get tocken & check if exist

exports.protect = catchAsync(async (req, res, next) => {
  //1.get tocken & check if exist
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  console.log(token);
  if (!token) {
    next(
      new AppError('You are not logged in! please login to get access', 401)
    );
  }
  //2.Verification signToken
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //3.check if user still exists

  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    next(new AppError('The user belonging to this token no longer exist', 401));
  }

  //4.check if user changed password after the token was issued

  if (currentUser.changePasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! please login again', 401)
    );
  }

  req.user = currentUser;
  res.locals.user = currentUser;

  //5.Grant Access

  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('you do not have permission to perform this action', 401)
      );
    }

    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1.get user

  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError('no user with this email address', 401));
  }

  //2.generate random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  //3.send it to users email
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    // await sendEmail({
    //   email: user.email,
    //   subject: 'your pass rest token (only valid for 10 min)',
    //   message
    // });
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'token sent to email'
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'something went wrong in sending mail for reseting password',
        500
      )
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1.get user based on the token

  const hashedToken = crypto
    .createHash('RSA-SHA512')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });
  //2.set new pass if token not expired and their is user
  if (!user) {
    return next(new AppError('Token is invalid or expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  //3.update changedpasswordAt property
  //4.log the user in, send jwt

  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1.get user from collection
  // const { email, password } = req.body;

  // if (!email || !password) {
  //   return next(
  //     new AppError('Pleasae Provide Email and current Password ', 400)
  //   );
  // }
  const user = await User.findById(req.user.id).select('+password');

  //2.check if pass is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(
      new AppError(
        'Please enter correct id and current password to update your password ',
        401
      )
    );
  }

  //3.if correct then update
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  //4. log in , send jwt
  createSendToken(user, 200, res);
});

//only for rendered pages sooo no error
exports.isLoggedIn = async (req, res, next) => {
  //1.get tocken & check if exist
  try {
    if (req.cookies.jwt) {
      // token = req.cookies.jwt;

      //2.Verification of Token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      //3.check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }
      //4.check if user changed password after the token was issued

      if (currentUser.changePasswordAfter(decoded.iat)) {
        return next();
      }

      //there is a logged in user
      res.locals.user = currentUser;
      return next();
    }
  } catch (err) {
    return next();
  }
  //5.Grant Access

  next();
};
