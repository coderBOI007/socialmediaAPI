const Post = require('../models/Post');
const User = require('../models/User');
const Follow = require('../models/Follow');
const Like = require('../models/Like');
const { success, error } = require('../utils/response');

// GET /posts — public, paginated, searchable, filterable, orderable
exports.getPublishedPosts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      author: authorQuery,
      title,
      tags,
      sort_by = 'created_at',
      order = 'desc',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const query = { state: 'published' };

    // Filter by title
    if (title) query.title = { $regex: title, $options: 'i' };

    // Filter by tags
    if (tags) {
      const tagList = tags.split(',').map(t => t.trim());
      query.tags = { $in: tagList };
    }

    // Search by author username/name — resolve to author IDs first
    if (authorQuery) {
      const matchedUsers = await User.find({
        $or: [
          { username: { $regex: authorQuery, $options: 'i' } },
          { first_name: { $regex: authorQuery, $options: 'i' } },
          { last_name: { $regex: authorQuery, $options: 'i' } },
        ],
      }).select('_id');
      query.author = { $in: matchedUsers.map(u => u._id) };
    }

    // Broad search across title, tags, and author
    if (search && !authorQuery) {
      const matchedUsers = await User.find({
        $or: [
          { username: { $regex: search, $options: 'i' } },
          { first_name: { $regex: search, $options: 'i' } },
          { last_name: { $regex: search, $options: 'i' } },
        ],
      }).select('_id');

      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
        { author: { $in: matchedUsers.map(u => u._id) } },
      ];
    }

    // Validate sort field
    const validSortFields = ['like_count', 'comment_count', 'created_at'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortDir = order === 'asc' ? 1 : -1;

    const [posts, total] = await Promise.all([
      Post.find(query)
        .populate('author', '-password')
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(limitNum),
      Post.countDocuments(query),
    ]);

    return success(res, { posts }, 200, {
      total,
      page: pageNum,
      limit: limitNum,
      total_pages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    console.error(err);
    return error(res, 'Failed to fetch posts.', 500);
  }
};

// GET /posts/:id — public, single published post with author
exports.getPost = async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, state: 'published' })
      .populate('author', '-password');
    if (!post) return error(res, 'Post not found.', 404);
    return success(res, { post });
  } catch (err) {
    if (err.name === 'CastError') return error(res, 'Post not found.', 404);
    return error(res, 'Failed to fetch post.', 500);
  }
};

// POST /posts — create post (auth required), starts as draft
exports.createPost = async (req, res) => {
  try {
    const { title, content, tags = [] } = req.body;

    const post = await Post.create({
      title,
      content,
      tags,
      author: req.user._id,
      state: 'draft',
    });

    return success(res, { post }, 201);
  } catch (err) {
    return error(res, 'Failed to create post.', 500);
  }
};

// PATCH /posts/:id — update post (owner only)
exports.updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return error(res, 'Post not found.', 404);
    if (post.author.toString() !== req.user._id.toString()) return error(res, 'Forbidden.', 403);

    const { title, content, tags, state } = req.body;

    if (title !== undefined) post.title = title;
    if (content !== undefined) post.content = content;
    if (tags !== undefined) post.tags = tags;
    if (state !== undefined) {
      if (!['draft', 'published'].includes(state)) {
        return error(res, 'State must be draft or published.', 422);
      }
      post.state = state;
    }

    await post.save();
    return success(res, { post });
  } catch (err) {
    if (err.name === 'CastError') return error(res, 'Post not found.', 404);
    return error(res, 'Failed to update post.', 500);
  }
};

// DELETE /posts/:id — delete post (owner only)
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return error(res, 'Post not found.', 404);
    if (post.author.toString() !== req.user._id.toString()) return error(res, 'Forbidden.', 403);

    await post.deleteOne();
    // Clean up likes for this post
    await Like.deleteMany({ post: req.params.id });

    return success(res, { message: 'Post deleted successfully.' });
  } catch (err) {
    if (err.name === 'CastError') return error(res, 'Post not found.', 404);
    return error(res, 'Failed to delete post.', 500);
  }
};

// GET /posts/me — owner's own posts, paginated + filterable by state
exports.getMyPosts = async (req, res) => {
  try {
    const { page = 1, limit = 20, state } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const query = { author: req.user._id };
    if (state) {
      if (!['draft', 'published'].includes(state)) {
        return error(res, 'State must be draft or published.', 422);
      }
      query.state = state;
    }

    const [posts, total] = await Promise.all([
      Post.find(query)
        .sort({ created_at: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Post.countDocuments(query),
    ]);

    return success(res, { posts }, 200, {
      total,
      page: pageNum,
      limit: limitNum,
      total_pages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    return error(res, 'Failed to fetch your posts.', 500);
  }
};

// GET /posts/feed — own + followed users' published posts
exports.getFeed = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const follows = await Follow.find({ follower: req.user._id }).select('following');
    const followedIds = follows.map(f => f.following);
    const authorIds = [req.user._id, ...followedIds];

    const query = { author: { $in: authorIds }, state: 'published' };

    const [posts, total] = await Promise.all([
      Post.find(query)
        .populate('author', '-password')
        .sort({ created_at: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Post.countDocuments(query),
    ]);

    return success(res, { posts }, 200, {
      total,
      page: pageNum,
      limit: limitNum,
      total_pages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    return error(res, 'Failed to fetch feed.', 500);
  }
};