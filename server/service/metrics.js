const Service = require('./base')
const workerMgr = require('../lib/worker-manager')

module.exports = class MetricsService extends Service {
  async getServices() {
    return workerMgr.getServices()
  }

  async getFunctions(service) {
    return workerMgr.getFunctions(service)
  }
}
