const { WorkerThreadsPool } = require('@sufang/worker-threads-pool')
const path = require('path')
const config = require('./config')
const cronus = require('./cronus')

class WorkerManager {
  constructor() {
    this._workerMap = new Map()
    this._serviceMap = new Map()
    this._activityMap = new Map()
    this._sleepingMap = new Map()
    this._key2service = new Map()

    this.logger = cronus.getLogger().child({ cls: 'WorkerManager' })

    const timer = setTimeout(() => {
      this._checkActivity()
      timer.refresh()
    }, config.checkActivityInterval)
  }

  create(opt) {
    const defaultOpt = {
      size: 1,
      task: path.join(__dirname, './worker.js'),
      workerData: {},
      resourceLimits: {
        stackSizeMb: 128
      }
    }
    opt = Object.assign({}, defaultOpt, opt)
    const worker = new WorkerThreadsPool(opt)
    worker.opt = opt
    return worker
  }

  add(service, path, method, worker) {
    method = method.toUpperCase()
    const key = `${service}${path}:${method}`
    if (this._workerMap.has(key)) {
      throw new Error(`${key} worker is already exists`)
    }
    worker.service = service
    worker.path = path
    worker.method = method
    this._workerMap.set(key, worker)
    const keys = this._serviceMap.get(service)
    keys ? this._serviceMap.set(service, [...keys, key]) : this._serviceMap.set(service, [key])
    this._key2service.set(key, service)
    this._updateActivity(service)
  }

  get(path, method) {
    method = method.toUpperCase()
    const key = `${path}:${method}`
    const worker = this._workerMap.get(key)
    if (!worker) {
      const service = this._key2service.get(key)
      if (!service) return null
      this.logger.info(`wake up service: ${service} !`)
      this._wake(service)
      return this._workerMap.get(key)
    }
    this._updateActivity(worker.service)
    return worker
  }

  getByService(service) {
    const keys = this._serviceMap.get(service)
    if (!keys) return []
    return keys.map(key => this._workerMap.get(key))
  }

  destroy(path, method) {
    const worker = this.get(path, method)
    if (worker) {
      worker.destroy()
    }
  }

  destroyByService(service, timeout = config.fnExitTime) {
    const workers = this.getByService(service)
    if (workers.length === 0) return
    const keys = this._serviceMap.get(service)
    this._serviceMap.delete(service)
    this._activityMap.delete(service)
    keys.map(key => this._workerMap.delete(key))
    return setTimeout(() => {
      workers.map(worker => worker && worker.destroy())
    }, timeout)
  }

  getServices() {
    return [...this._serviceMap.keys()]
  }

  getFunctions(service) {
    const keys = service ? this._serviceMap.get(service) || [] : [...this._workerMap.keys()]
    return keys.map(key => {
      const [path, method] = key.split(':')
      return { path, method }
    })
  }

  _updateActivity(service) {
    this._activityMap.set(service, Date.now())
  }

  _checkActivity() {
    const now = Date.now()
    for (const [service, lasttime] of this._activityMap.entries()) {
      if (now - lasttime > config.fnActiveTime) {
        this.logger.info(`service: ${service} is silent, take it going to sleep !`)
        this._sleep(service)
      }
    }
  }

  _sleep(service) {
    const workers = this.getByService(service)
    const workerInfoList = workers.map(worker => {
      return {
        opt: worker.opt,
        path: worker.path,
        method: worker.method
      }
    })
    this.destroyByService(service, 0)
    this._sleepingMap.set(service, workerInfoList)
    this._activityMap.delete(service)
  }

  _wake(service) {
    const workerInfoList = this._sleepingMap.get(service)
    workerInfoList.map(({ opt, path, method }) => {
      const worker = this.create(opt)
      this.add(service, path, method, worker)
    })
    this._sleepingMap.delete(service)
  }
}

module.exports = new WorkerManager()
