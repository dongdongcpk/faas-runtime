const Controller = require('./base')
const config = require('../lib/config')

module.exports = class RuntimeController extends Controller {
  async deploy() {
    const { ctx, service } = this
    const body = ctx.request.body
    const deployTaskId = await service.runtime.deploy(body.service, body.version)
    ctx.body = {
      code: 0,
      data: {
        deployTaskId
      }
    }
  }

  async dispatch() {
    const { ctx, service } = this
    const path = ctx.path.replace(`${config.baseURI}${config.fnPrefix}/`, '')
    const { status, message, response, body } = await service.runtime.dispatch(path, ctx.method)
    if (status) ctx.status = status
    if (message) ctx.message = message
    ctx.set({ ...response.header })
    ctx.body = body
  }

  async recover() {
    const { ctx, service } = this
    await service.runtime.recover()
    ctx.body = {
      code: 0
    }
  }
}
