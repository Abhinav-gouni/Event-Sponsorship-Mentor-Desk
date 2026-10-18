export default function errorMiddleware(error, req, res, next) {
  console.error(error);
  res.status(error.statusCode || 500).json({
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {}),
  });
}
