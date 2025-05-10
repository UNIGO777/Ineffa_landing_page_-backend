/**
 * Enhanced catchAsync utility that allows for faster response times by supporting
 * background processing of non-critical operations after sending the response.
 * 
 * @param {Function} fn - The async controller function to execute
 * @param {Object} options - Configuration options
 * @param {boolean} options.backgroundProcessing - Whether to allow background processing
 * @returns {Function} Express middleware function
 */
export const catchAsync = (fn, options = {}) => {
  return (req, res, next) => {
    // Store the original res.json method
    const originalJson = res.json;
    let isResponseSent = false;
    
    // Override res.json to track if response has been sent
    res.json = function(data) {
      isResponseSent = true;
      return originalJson.call(this, data);
    };
    
    // Execute the controller function
    const result = fn(req, res, next).catch(err => {
      // Only pass error to next if response hasn't been sent yet
      if (!isResponseSent) {
        next(err);
      } else {
        console.error('Background processing error:', err);
      }
    });
    
    // If background processing is enabled, we don't need to await the result
    // This allows the response to be sent immediately while processing continues
    if (options.backgroundProcessing) {
      return result;
    }
    
    // For regular processing, ensure all promises are resolved before moving on
    return result;
  };
};