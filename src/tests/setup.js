const { MongoMemoryServer } = require('mongodb-memory-server');
const { connect, disconnect } = require('../src/utils/db');

let mongod;

// Start in-memory MongoDB before all tests
beforeAll(async () => {
  try {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await connect(uri);
  } catch (err) {
    // Fallback: use a real test MongoDB URI if in-memory server fails to download
    const testUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/social-api-test';
    console.warn('⚠️  MongoMemoryServer unavailable, falling back to:', testUri);
    await connect(testUri);
  }
});

// Clear all collections between tests for isolation
beforeEach(async () => {
  const mongoose = require('mongoose');
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Disconnect and stop after all tests
afterAll(async () => {
  await disconnect();
  if (mongod) await mongod.stop();
});