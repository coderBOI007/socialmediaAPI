const success = (res, data, statusCode = 200, meta = {}) => {
  const body = { status: 'success', data };
  if (Object.keys(meta).length) body.meta = meta;
  return res.status(statusCode).json(body);
};

const error = (res, message, statusCode = 400, errors = null) => {
  const body = { status: 'error', message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};

module.exports = { success, error };