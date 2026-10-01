/**
 * errorMiddleware.js
 * Global error handler.
 * Catches any error that was passed to next(error) anywhere in the app.
 * Ensures we never leak raw database errors to the client.
 */

const errorHandler = (err, req, res, next) => {
  // Log the full error on the server side (for debugging)
  console.error('❌ Unhandled error:', err.message);

  // Use a custom statusCode if the error was created with one,
  // otherwise default to 500 (Internal Server Error)
  const statusCode = err.statusCode || 500;

  // In development, include the error message for easier debugging.
  // In production, hide internal details from the client.
  const message =
    statusCode < 500
      ? err.message
      : 'An internal server error occurred. Please try again later.';

  return res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = { errorHandler };