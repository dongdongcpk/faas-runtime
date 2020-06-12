const cronus = require('./lib/cronus')
const config = require('./lib/config')
const loadModules = require('./lib/load-modules')
const graceful = require('node-graceful')
graceful.captureExceptions = false

const services = loadModules(__dirname, 'service')
const controllers = loadModules(__dirname, 'controller')

class App {
  constructor() {
    this.controller = {}
    this.service = {}
  }

  loadServices(ctx) {
    const { service } = this
    services.map(mod => {
      const Ctor = mod.exports
      Object.defineProperty(service, mod.name, {
        configurable: true,
        get() {
          return new Ctor(ctx, service)
        }
      })
    })
  }

  loadControllers() {
    const { service } = this
    controllers.map(mod => {
      this.controller[mod.name] = new Proxy(
        {},
        {
          get(target, prop) {
            return async ctx => {
              const Ctor = mod.exports
              const inst = new Ctor(ctx, service)
              return inst[prop]()
            }
          }
        }
      )
    })
  }

  async startup() {
    const logger = cronus.getLogger()

    graceful.on('exit', async () => {
      logger.info('cronus 退出')
      cronus.exit()
    })

    // 加载中间件
    cronus.addMiddleware(async (ctx, next) => {
      ctx.log = ctx.logger = logger
      await next()
    })
    cronus.addMiddleware(async (ctx, next) => {
      try {
        await next()
      } catch (err) {
        ctx.body = {
          code: 1,
          error: err.message
        }
      }
    })
    cronus.addMiddleware(require('koa-bodyparser')())

    // 挂载 service
    cronus.addMiddleware(async (ctx, next) => {
      this.loadServices(ctx)
      await next()
    })

    // 挂载 controller
    this.loadControllers()

    // 初始化路由
    cronus.initRouter(require('./router')(this, config))

    await cronus.start()
    logger.info('cronus 服务启动')
  }
}

const app = new App()
app.startup()
