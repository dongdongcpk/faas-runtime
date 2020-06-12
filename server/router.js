const Router = require('@koa/router')

module.exports = (app, config) => {
  const router = new Router({
    prefix: config.baseURI
  })

  router.put('/api/deploy', app.controller.runtime.deploy)
  router.put('/api/recover', app.controller.runtime.recover)
  router.get('/api/cat/services', app.controller.metrics.getServices)
  router.get('/api/cat/functions', app.controller.metrics.getFunctions)
  router.all(`${config.fnPrefix}/*`, app.controller.runtime.dispatch)

  return router
}
