import handler from './mcp.js';

/**
 * Wrapper to make the API handler compatible with native Node.js HTTP server
 * Adds Express-like methods to the response object
 */
export function wrapHandler(handler) {
  return async (req, res) => {
    // Add Express-like status method if not present
    if (!res.status) {
      res.status = function(code) {
        this.statusCode = code;
        return this;
      };
    }
    
    // Add Express-like json method if not present
    if (!res.json) {
      res.json = function(data) {
        if (!this.headersSent) {
          this.setHeader('Content-Type', 'application/json');
          this.end(JSON.stringify(data));
        }
        return this;
      };
    }
    
    // Add Express-like end method override
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
      if (arguments.length === 0 && this.statusCode) {
        // Just status code was set, send empty response
        originalEnd.call(this);
      } else {
        originalEnd.call(this, chunk, encoding);
      }
      return this;
    };
    
    // Call the original handler
    await handler(req, res);
  };
}

export default handler;