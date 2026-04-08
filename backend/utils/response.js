/**
 * Standardized API response helpers.
 *
 * Usage:
 *   const { sendSuccess, sendError } = require('../utils/response');
 *
 *   sendSuccess(res, data)                          // 200
 *   sendSuccess(res, data, 'Created', 201)          // 201 + message
 *   sendError(res, 'Not found', 404)                // 404
 *   sendError(res, 'Server error', 500)             // 500
 */

const sendSuccess = (res, data, message = null, status = 200) => {
  const payload = { success: true, data };
  if (message) payload.message = message;
  res.status(status).json(payload);
};

const sendError = (res, message, status = 400) => {
  res.status(status).json({ success: false, error: message });
};

module.exports = { sendSuccess, sendError };
