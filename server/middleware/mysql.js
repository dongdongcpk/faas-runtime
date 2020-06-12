const { workerData } = require('worker_threads')
const Mysql = require('@sufang/mysql-client')

function getMySQL() {
  const mysql = workerData?.mysql
  if (!mysql) return

  return new Mysql(mysql)
}

module.exports = getMySQL()
