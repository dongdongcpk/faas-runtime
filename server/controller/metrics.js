const Controller = require('./base')

module.exports = class MetricsController extends Controller {
  async getServices() {
    const { ctx, service } = this
    ctx.body = await service.metrics.getServices()
  }

  async getFunctions() {
    const { ctx, service } = this
    const { service: serviceName } = ctx.query
    ctx.body = await service.metrics.getFunctions(serviceName)
  }
}
