const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Server error';

  if (err.name === 'CastError') {
    status = err.path === '_id' ? 404 : 400;
    message = err.path === '_id' ? 'Record not found' : `Invalid value for ${err.path}`;
  } else if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  } else if (err.code === 11000) {
    status = 409;
    const fields = Object.keys(err.keyValue || {}).filter((key) => key !== 'userId');
    message = fields.includes('email')
      ? 'An account with this email already exists'
      : `A record with this ${fields.join(', ') || 'value'} already exists`;
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Upload is too large. Please use a smaller file.';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid request body';
  }

  if (status >= 500) {
    console.error(err);
    if (process.env.NODE_ENV === 'production') message = 'Something went wrong. Please try again.';
  }

  res.status(status).json({ message });
};

module.exports = { notFound, errorHandler };
