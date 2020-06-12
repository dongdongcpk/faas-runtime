const logger = require('../middleware/log')
const fetch = require('../middleware/fetch')
const mysql = require('../middleware/mysql')
const redis = require('../middleware/redis')

module.exports = {
  wrapContext(ctx) {
    ctx.set = (key, value) => {
      ctx.response.header[key] = value
    }
    ctx.log = ctx.logger = logger
    ctx.fetch = fetch
    ctx.mysql = mysql
    ctx.redis = redis
  },

  extractContext(rawContext) {
    const ctx = {
      headers: rawContext.headers,
      method: rawContext.method,
      url: rawContext.url,
      path: rawContext.path,
      query: rawContext.query,
      querystring: rawContext.querystring,
      host: rawContext.host,
      hostname: rawContext.hostname,
      request: {
        body: rawContext.request.body
      },
      response: {
        header: {}
      }
    }
    return ctx
  },

  extractResponseContext(ctx) {
    return {
      status: ctx.status,
      message: ctx.message,
      response: ctx.response,
      body: ctx.body
    }
  }
}
