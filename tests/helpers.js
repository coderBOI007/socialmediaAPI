const request = require('supertest');
const app = require('../src/app');

const api = request(app);

let _counter = 0;
const uid = () => `${++_counter}${Math.random().toString(36).substr(2, 6)}`;

const createUser = async (overrides = {}) => {
  const id = uid();
  const defaults = {
    first_name: 'Test',
    last_name: 'User',
    username: `user_${id}`,
    email: `user${id}@example.com`,
    password: 'password123',
  };
  const payload = { ...defaults, ...overrides };
  const res = await api.post('/api/auth/signup').send(payload);
  if (!res.body.data) {
    throw new Error(`createUser failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return { user: res.body.data.user, token: res.body.data.token, payload };
};

const createPost = async (token, overrides = {}) => {
  const defaults = {
    title: `Test Post ${uid()}`,
    content: 'This is test post content.',
    tags: ['test', 'api'],
  };
  const res = await api
    .post('/api/posts')
    .set('Authorization', `Bearer ${token}`)
    .send({ ...defaults, ...overrides });
  if (!res.body.data) throw new Error(`createPost failed: ${JSON.stringify(res.body)}`);
  return res.body.data.post;
};

const publishPost = async (token, postId) => {
  const res = await api
    .patch(`/api/posts/${postId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ state: 'published' });
  return res.body.data.post;
};

module.exports = { api, createUser, createPost, publishPost };