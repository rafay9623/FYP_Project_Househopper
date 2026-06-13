/**
 * Async handler to wrap async route controllers
 * Passes rejected promises to express error handling middleware
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

export default asyncHandler
