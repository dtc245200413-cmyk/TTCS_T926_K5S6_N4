/**
 * response.js
 * Helper functions to send consistent JSON responses.
 * All API responses follow the same structure.
 */

/**
 * Send a success response.
 * @param {object} res       - Express response object
 * @param {string} message   - Human-readable message
 * @param {*}      data      - Response payload (object, array, etc.)
 * @param {number} statusCode - HTTP status code (default 200)
 */
const sendSuccess = (res, message, data = null, statusCode = 200) => {
  const response = {
    success: true,
    message,
  };
  // Only include 'data' key if there is actual data to send
  if (data !== null && data !== undefined) {
    response.data = data;
  }
  return res.status(statusCode).json(response);
};

/**
 * Send an error response.
 * @param {object} res        - Express response object
 * @param {string} message    - Human-readable error message
 * @param {number} statusCode - HTTP status code (default 500)
 */
const sendError = (res, message, statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = { sendSuccess, sendError };
