export const notFoundHandler = (req, res) => {
  res.status(404).json({ detail: `Route ${req.method} ${req.originalUrl} not found.` });
};

export const errorHandler = (err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({
    detail: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
};
