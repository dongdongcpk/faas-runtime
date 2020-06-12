process.on('unhandledRejection', err => {
  throw err
})

const { parentPort, workerData } = require('worker_threads')
const { wrapContext, extractResponseContext } = require('./context')
const path = require('path')
const fs = require('fs')
const config = require('./config')

function getHandler() {
  const { service, handler: handlerName } = workerData
  const arr = handlerName.split('.')
  let fnPath = path.join(config.fnDir, service, ...arr)
  if (!fs.existsSync(fnPath)) {
    const fn = arr.pop()
    fnPath = path.join(config.fnDir, service, ...arr)
    return require(fnPath)[fn]
  }
  return require(fnPath)
}

const handler = getHandler()

parentPort.on('message', async ({ ctx }) => {
  wrapContext(ctx)
  ctx.body = await handler(ctx)
  const responseCtx = extractResponseContext(ctx)
  parentPort.postMessage(responseCtx)
})
