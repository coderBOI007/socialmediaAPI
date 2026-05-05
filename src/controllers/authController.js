const User = require('../models/User');
const { signToken } = require('../utils/jwt');
const { success, error } = require('../utils/response');

exports.signup = async (req, res) => {
  try {
    const { first_name, last_name, username, email, password, bio, avatar_url } = req.body;

    const user = await User.create({
      first_name,
      last_name,
      username,
      email,
      password,
      bio,
      avatar_url,
    });

    const token = signToken({ id: user._id });
    return success(res, { user, token }, 201);
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return error(res, `${field} already in use.`, 409);
    }
    console.error('SIGNUP ERROR:', err);
return error(res, 'Server error during signup.', 500);
  }
};

exports.signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) return error(res, 'Invalid credentials.', 401);

    const match = await user.comparePassword(password);
    if (!match) return error(res, 'Invalid credentials.', 401);

    const token = signToken({ id: user._id });
    return success(res, { user, token });
  } catch (err) {
    return error(res, 'Server error during signin.', 500);
  }
};

exports.getMe = async (req, res) => {
  return success(res, { user: req.user });
};