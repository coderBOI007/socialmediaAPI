const mongoose = require('mongoose');

const connect = async (uri) => {
  const mongoUri = uri || process.env.MONGODB_URI;
  await mongoose.connect(mongoUri);
  console.log(`✅ MongoDB connected: ${mongoose.connection.host}`);
};

const disconnect = async () => {
  await mongoose.disconnect();
};

module.exports = { connect, disconnect };