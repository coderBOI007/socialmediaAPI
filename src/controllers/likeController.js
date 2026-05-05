const Like = require('../models/Like');
const Post = require('../models/Post');
const { success, error } = require('../utils/response');

// POST /posts/:id/like
exports.likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return error(res, 'Post not found.', 404);

    await Like.create({ user: req.user._id, post: req.params.id });

    // Increment like_count atomically
    await Post.findByIdAndUpdate(req.params.id, { $inc: { like_count: 1 } });

    return success(res, { message: 'Post liked successfully.' }, 201);
  } catch (err) {
    if (err.code === 11000) return error(res, 'You have already liked this post.', 409);
    if (err.name === 'CastError') return error(res, 'Post not found.', 404);
    return error(res, 'Failed to like post.', 500);
  }
};

// DELETE /posts/:id/like
exports.unlikePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return error(res, 'Post not found.', 404);

    const result = await Like.findOneAndDelete({ user: req.user._id, post: req.params.id });
    if (!result) return error(res, 'You have not liked this post.', 404);

    // Decrement like_count atomically (never below 0)
    await Post.findByIdAndUpdate(req.params.id, {
      $inc: { like_count: -1 },
    });

    return success(res, { message: 'Post unliked successfully.' });
  } catch (err) {
    if (err.name === 'CastError') return error(res, 'Post not found.', 404);
    return error(res, 'Failed to unlike post.', 500);
  }
};