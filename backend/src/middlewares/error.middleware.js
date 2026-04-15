class AppError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Async handler to remove repetitive try/catch in controllers.
 */
const asyncHandler = (handler) => async (req, res, next) => {
  try {
    await handler(req, res, next);
  } catch (error) {
    next(error);
  }
};

/**
 * Maps known errors into stable API responses.
 */
const errorMiddleware = (error, req, res, next) => {
  const statusCode = error.statusCode || 500;
  const payload = {
    message: error.message || "Internal server error",
  };

  if (error.details) {
    payload.details = error.details;
  }

  res.status(statusCode).json(payload);
};

module.exports = {
  AppError,
  asyncHandler,
  errorMiddleware,
};
