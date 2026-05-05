const Follow = require('../models/Follow');
const User = require('../models/User');
const { success, error } = require('../utils/response');

// POST /users/:id/follow
exports.followUser = async (req, res) => {
  try {
    const targetId = req.params.id;
    const followerId = req.user._id.toString();

    if (targetId === followerId) {
      return error(res, 'You cannot follow yourself.', 400);
    }

    const target = await User.findById(targetId);
    if (!target) return error(res, 'User not found.', 404);

    await Follow.create({ follower: followerId, following: targetId });

    return success(res, { message: `You are now following ${target.username}.` }, 201);
  } catch (err) {
    if (err.code === 11000) return error(res, 'You are already following this user.', 409);
    if (err.name === 'CastError') return error(res, 'User not found.', 404);
    return error(res, 'Failed to follow user.', 500);
  }
};

// DELETE /users/:id/follow
exports.unfollowUser = async (req, res) => {
  try {
    const targetId = req.params.id;
    const followerId = req.user._id;

    const result = await Follow.findOneAndDelete({ follower: followerId, following: targetId });
    if (!result) return error(res, 'You are not following this user.', 404);

    return success(res, { message: 'Unfollowed successfully.' });
  } catch (err) {
    if (err.name === 'CastError') return error(res, 'User not found.', 404);
    return error(res, 'Failed to unfollow user.', 500);
  }
};

// GET /users/:id/following
exports.getFollowing = async (req, res) => {
  try {
    const follows = await Follow.find({ follower: req.params.id })
      .populate('following', '-password')
      .sort({ created_at: -1 });

    const following = follows.map(f => ({
      ...f.following.toJSON(),
      followed_at: f.created_at,
    }));

    return success(res, { following, total: following.length });
  } catch (err) {
    if (err.name === 'CastError') return error(res, 'User not found.', 404);
    return error(res, 'Failed to fetch following list.', 500);
  }
};

// GET /users/:id/followers
exports.getFollowers = async (req, res) => {
  try {
    const follows = await Follow.find({ following: req.params.id })
      .populate('follower', '-password')
      .sort({ created_at: -1 });

    const followers = follows.map(f => ({
      ...f.follower.toJSON(),
      followed_at: f.created_at,
    }));

    return success(res, { followers, total: followers.length });
  } catch (err) {
    if (err.name === 'CastError') return error(res, 'User not found.', 404);
    return error(res, 'Failed to fetch followers list.', 500);
  }
};