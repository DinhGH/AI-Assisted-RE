function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a failing async operation with a small fixed delay.
 *
 * WHY: Docker Compose starts services in order, but dependent services may still
 * not be ready. Retrying here avoids fragile manual restarts during boot.
 */
async function retryAsync(
  operation,
  { retries = 10, delayMs = 3000, label = "operation" } = {},
) {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;

      // A short pause gives MySQL/Redis time to become ready without busy looping.
      await sleep(delayMs);
    }
  }

  const wrapped = new Error(
    `Failed to complete ${label} after ${retries} attempts`,
  );
  wrapped.cause = lastError;
  throw wrapped;
}

module.exports = {
  retryAsync,
};
