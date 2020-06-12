const Logger = require('@sufang/logger')
const { workerData } = require('worker_threads')
const name = workerData?.service ?? 'default'
module.exports = new Logger({ name })
