const { workerData } = require('worker_threads')
const Redis = require('ioredis')

function getRedis() {
  const redis = workerData?.redis
  if (!redis) return

  return new Redis(redis)
}

module.exports = getRedis()
