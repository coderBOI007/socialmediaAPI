require('./setup');
const { api, createUser, createPost, publishPost } = require('./helpers');

describe('Post Endpoints', () => {
  let owner, ownerToken, otherToken;

  beforeEach(async () => {
    const u1 = await createUser();
    const u2 = await createUser();
    owner = u1.user;
    ownerToken = u1.token;
    otherToken = u2.token;
  });

  describe('POST /api/posts', () => {
    it('should create a post in draft state', async () => {
      const res = await api.post('/api/posts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: 'Hello World', content: 'Some content', tags: ['tech'] });
      expect(res.status).toBe(201);
      expect(res.body.data.post.state).toBe('draft');
      expect(res.body.data.post.like_count).toBe(0);
      expect(res.body.data.post.comment_count).toBe(0);
    });

    it('should return 401 when unauthenticated', async () => {
      const res = await api.post('/api/posts').send({ title: 'Test', content: 'Content' });
      expect(res.status).toBe(401);
    });

    it('should return 422 for missing title', async () => {
      const res = await api.post('/api/posts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ content: 'No title' });
      expect(res.status).toBe(422);
    });

    it('should return 422 for missing content', async () => {
      const res = await api.post('/api/posts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: 'No content' });
      expect(res.status).toBe(422);
    });
  });

  describe('GET /api/posts', () => {
    beforeEach(async () => {
      const p1 = await createPost(ownerToken, { title: 'Alpha Post', tags: ['javascript', 'node'] });
      const p2 = await createPost(ownerToken, { title: 'Beta Post', tags: ['python'] });
      await createPost(ownerToken, { title: 'Draft Post' }); // stays draft
      await publishPost(ownerToken, p1._id);
      await publishPost(ownerToken, p2._id);
    });

    it('should list only published posts (no auth)', async () => {
      const res = await api.get('/api/posts');
      expect(res.status).toBe(200);
      expect(res.body.data.posts.every(p => p.state === 'published')).toBe(true);
    });

    it('should default to 20 per page', async () => {
      const res = await api.get('/api/posts');
      expect(res.body.meta.limit).toBe(20);
    });

    it('should paginate correctly', async () => {
      const res = await api.get('/api/posts?page=1&limit=1');
      expect(res.status).toBe(200);
      expect(res.body.data.posts.length).toBe(1);
      expect(res.body.meta.total_pages).toBeGreaterThanOrEqual(2);
    });

    it('should filter by title', async () => {
      const res = await api.get('/api/posts?title=Alpha');
      expect(res.status).toBe(200);
      expect(res.body.data.posts.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.posts[0].title).toMatch(/Alpha/i);
    });

    it('should filter by tags', async () => {
      const res = await api.get('/api/posts?tags=javascript');
      expect(res.status).toBe(200);
      expect(res.body.data.posts.every(p => p.tags.includes('javascript'))).toBe(true);
    });

    it('should be orderable by like_count', async () => {
      const res = await api.get('/api/posts?sort_by=like_count&order=desc');
      expect(res.status).toBe(200);
    });

    it('should be orderable by created_at ascending', async () => {
      const res = await api.get('/api/posts?sort_by=created_at&order=asc');
      expect(res.status).toBe(200);
      const posts = res.body.data.posts;
      if (posts.length >= 2) {
        expect(new Date(posts[0].created_at) <= new Date(posts[1].created_at)).toBe(true);
      }
    });

    it('should search across title, tags, and author', async () => {
      const res = await api.get('/api/posts?search=Alpha');
      expect(res.status).toBe(200);
      expect(res.body.data.posts.length).toBeGreaterThanOrEqual(1);
    });

    it('should include author info on each post (no password)', async () => {
      const res = await api.get('/api/posts');
      expect(res.body.data.posts[0].author).toBeDefined();
      expect(res.body.data.posts[0].author.password).toBeUndefined();
    });

    it('should include pagination meta', async () => {
      const res = await api.get('/api/posts');
      expect(res.body.meta.total).toBeDefined();
      expect(res.body.meta.page).toBeDefined();
      expect(res.body.meta.total_pages).toBeDefined();
    });
  });

  describe('GET /api/posts/:id', () => {
    it('should return a published post with author info', async () => {
      const post = await createPost(ownerToken);
      await publishPost(ownerToken, post._id);
      const res = await api.get(`/api/posts/${post._id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.post.author).toBeDefined();
      expect(res.body.data.post.author.password).toBeUndefined();
    });

    it('should return 404 for a draft post (public access)', async () => {
      const post = await createPost(ownerToken);
      const res = await api.get(`/api/posts/${post._id}`);
      expect(res.status).toBe(404);
    });

    it('should return 404 for non-existent post', async () => {
      const res = await api.get('/api/posts/64a1b2c3d4e5f6a7b8c9d0e1');
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/posts/:id', () => {
    let draftPost, publishedPost;

    beforeEach(async () => {
      draftPost = await createPost(ownerToken, { title: 'Original Title' });
      publishedPost = await createPost(ownerToken, { title: 'Published Title' });
      await publishPost(ownerToken, publishedPost._id);
    });

    it('should allow owner to publish a draft post', async () => {
      const res = await api.patch(`/api/posts/${draftPost._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ state: 'published' });
      expect(res.status).toBe(200);
      expect(res.body.data.post.state).toBe('published');
    });

    it('should allow owner to edit a draft post', async () => {
      const res = await api.patch(`/api/posts/${draftPost._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: 'Updated Title' });
      expect(res.status).toBe(200);
      expect(res.body.data.post.title).toBe('Updated Title');
    });

    it('should allow owner to edit a published post', async () => {
      const res = await api.patch(`/api/posts/${publishedPost._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: 'Updated Published Title' });
      expect(res.status).toBe(200);
      expect(res.body.data.post.title).toBe('Updated Published Title');
    });

    it('should return 403 when non-owner tries to update', async () => {
      const res = await api.patch(`/api/posts/${draftPost._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ title: 'Hacked' });
      expect(res.status).toBe(403);
    });

    it('should return 422 for invalid state value', async () => {
      const res = await api.patch(`/api/posts/${draftPost._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ state: 'archived' });
      expect(res.status).toBe(422);
    });

    it('should return 401 without authentication', async () => {
      const res = await api.patch(`/api/posts/${draftPost._id}`).send({ title: 'No auth' });
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/posts/:id', () => {
    it('should allow owner to delete a draft post', async () => {
      const post = await createPost(ownerToken);
      const res = await api.delete(`/api/posts/${post._id}`).set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
    });

    it('should allow owner to delete a published post', async () => {
      const post = await createPost(ownerToken);
      await publishPost(ownerToken, post._id);
      const res = await api.delete(`/api/posts/${post._id}`).set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
    });

    it('should return 403 when non-owner tries to delete', async () => {
      const post = await createPost(ownerToken);
      const res = await api.delete(`/api/posts/${post._id}`).set('Authorization', `Bearer ${otherToken}`);
      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent post', async () => {
      const res = await api.delete('/api/posts/64a1b2c3d4e5f6a7b8c9d0e1').set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(404);
    });

    it('should return 401 without authentication', async () => {
      const post = await createPost(ownerToken);
      const res = await api.delete(`/api/posts/${post._id}`);
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/posts/me', () => {
    beforeEach(async () => {
      const p = await createPost(ownerToken, { title: 'My Published' });
      await createPost(ownerToken, { title: 'My Draft' });
      await publishPost(ownerToken, p._id);
    });

    it('should return all own posts (draft + published)', async () => {
      const res = await api.get('/api/posts/me').set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.posts.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by state=draft', async () => {
      const res = await api.get('/api/posts/me?state=draft').set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.posts.every(p => p.state === 'draft')).toBe(true);
    });

    it('should filter by state=published', async () => {
      const res = await api.get('/api/posts/me?state=published').set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.posts.every(p => p.state === 'published')).toBe(true);
    });

    it('should be paginated', async () => {
      const res = await api.get('/api/posts/me?limit=1').set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.posts.length).toBe(1);
      expect(res.body.meta).toBeDefined();
    });

    it('should return 422 for invalid state filter', async () => {
      const res = await api.get('/api/posts/me?state=invalid').set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(422);
    });

    it('should return 401 without authentication', async () => {
      const res = await api.get('/api/posts/me');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/posts/feed', () => {
    it('should include own published posts', async () => {
      const post = await createPost(ownerToken, { title: 'My Feed Post' });
      await publishPost(ownerToken, post._id);
      const res = await api.get('/api/posts/feed').set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      const ids = res.body.data.posts.map(p => p._id);
      expect(ids).toContain(post._id);
    });

    it('should include followed users posts', async () => {
      const { user: other, token: otherTok } = await createUser();
      const otherPost = await createPost(otherTok, { title: "Other's Post" });
      await publishPost(otherTok, otherPost._id);
      await api.post(`/api/users/${other._id}/follow`).set('Authorization', `Bearer ${ownerToken}`);
      const res = await api.get('/api/posts/feed').set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      const ids = res.body.data.posts.map(p => p._id);
      expect(ids).toContain(otherPost._id);
    });

    it('should return 401 without authentication', async () => {
      const res = await api.get('/api/posts/feed');
      expect(res.status).toBe(401);
    });
  });
});