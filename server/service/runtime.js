const Service = require('./base')
const workerMgr = require('../lib/worker-manager')
const { extractContext } = require('../lib/context')
const { TABLE, RUNTIME_STATUS, PACKAGE_STATUS } = require('../constant')
const cronus = require('../lib/cronus')
const config = require('../lib/config')
const axios = require('axios')
const fs = require('fs')
const fsPromises = fs.promises
const path = require('path')
const stream = require('stream')
const { promisify } = require('util')
const finished = promisify(stream.finished)
const hasha = require('hasha')
const { loadYaml } = require('../lib/util')
const shell = require('shelljs')

module.exports = class RuntimeService extends Service {
  async deploy(service, version) {
    const { ctx } = this
    const deployTaskId = await this.initStatus(service, version)
    this.execDeployTask(service, version, deployTaskId).catch(err => {
      ctx.logger.error(err)
      this.updateStatus(deployTaskId, RUNTIME_STATUS.OFFLINE)
    })
    return deployTaskId
  }

  async execDeployTask(service, version, deployTaskId, isRecover = false) {
    // clear dir
    const serviceDir = path.join(config.fnDir, service)
    if (fs.existsSync(serviceDir)) {
      await this.clearDir(serviceDir)
    }
    // download pkg
    const filePath = await this.downloadPkg(service, version)
    // decompress
    const { dir } = path.parse(filePath)
    await this.decompressPkg(filePath, dir)
    // load config
    const fnConfig = await this.loadFnConfig(dir)
    // create worker
    await this.createWorker({
      service,
      functions: this.extractConfig(fnConfig)
    })
    if (isRecover) return
    // update status
    const mysql = cronus.getMySQLClient()
    const tran = await mysql.beginTransaction()
    try {
      await this.offlineService(service, tran)
      await this.updateStatus(deployTaskId, RUNTIME_STATUS.ONLINE, tran)
      await tran.commit()
    } catch (err) {
      await tran.rollback()
      throw err
    }
  }

  async decompressPkg(filePath, dir) {
    return new Promise((resolve, reject) => {
      shell.exec(`cd ${dir} && tar -xzvf ${filePath}`, (code, stdout, stderr) => {
        if (code !== 0) {
          const error = new Error(stderr)
          error.code = code
          return reject(error)
        }
        resolve(stdout)
      })
    })
  }

  async loadFnConfig(servicePath) {
    const fnConfig = new Map()
    const dir = await fsPromises.opendir(servicePath)
    for await (const dirent of dir) {
      if (dirent.isDirectory()) {
        const config = loadYaml(path.join(servicePath, dirent.name, 'node', 'serverless.yaml'))
        fnConfig.set(dirent.name, config)
      }
    }
    return fnConfig
  }

  extractConfig(fnConfig) {
    const configList = []
    for (const [dirname, { functions, mysql, redis }] of fnConfig.entries()) {
      Object.values(functions).map(({ handler, events }) => {
        const { path, method } = events[0].http
        configList.push({
          handler: `${dirname}.node.functions.${handler}`,
          path,
          method: method.toUpperCase(),
          mysql,
          redis
        })
      })
    }
    return configList
  }

  async createWorker({ service, functions }) {
    const workers = []
    functions.map(({ handler, path, method, mysql, redis }) => {
      try {
        const worker = workerMgr.create({
          workerData: {
            service,
            handler,
            mysql,
            redis
          }
        })
        workers.push({ path, method, worker })
      } catch (err) {
        workers.map(({ worker }) => worker.destroy())
        throw err
      }
    })
    // delay destroy old worker
    workerMgr.destroyByService(service)

    workers.map(({ path, method, worker }) => {
      workerMgr.add(service, path, method, worker)
    })
  }

  async downloadPkg(service, version) {
    const { pkg_url, shasum } = await this.getPkgUrl(service, version)
    // download
    const dir = path.join(config.fnDir, service)
    await fsPromises.mkdir(dir, { recursive: true })
    const filePath = path.join(dir, 'pkg.tar.gz')
    const writable = fs.createWriteStream(filePath)
    await axios({
      url: pkg_url,
      responseType: 'stream'
    }).then(res => {
      res.data.pipe(writable)
      return finished(writable)
    })
    // check shasum
    const ret = await hasha.fromFile(filePath, { algorithm: 'sha256' })
    if (ret !== shasum) {
      throw new Error(`check shasum failed ! expect: ${shasum}, but got: ${ret}`)
    }
    return filePath
  }

  async getPkgUrl(service, version) {
    const mysql = cronus.getMySQLClient()
    const sql = `
      select
      id, service, version, pkg_url, shasum
      from ${TABLE.SLS_PACKAGE}
      where
      service="${service}"
      and version="${version}"
      and status="${PACKAGE_STATUS.SUCCESS}"
      order by id desc
      limit 1
    `
    const results = await mysql.query(sql)
    if (results.length === 0) {
      throw new Error(`can't find package about service: ${service}, version: ${version}`)
    }
    return results[0]
  }

  async initStatus(service, version, status = RUNTIME_STATUS.DEPLOYING) {
    const mysql = cronus.getMySQLClient()
    const sql = `
      insert into ${TABLE.SLS_RUNTIME_STATUS}
      (service, version, status)
      values
      ("${service}", "${version}", "${status}")
    `
    const { insertId: deployTaskId } = await mysql.query(sql)
    return deployTaskId
  }

  async updateStatus(id, status, tran) {
    const mysql = tran || cronus.getMySQLClient()
    const sql = `
      update ${TABLE.SLS_RUNTIME_STATUS}
      set status="${status}"
      where id=${id}
    `
    return mysql.query(sql)
  }

  async offlineService(service, tran) {
    const mysql = tran || cronus.getMySQLClient()
    const sql = `
      update ${TABLE.SLS_RUNTIME_STATUS}
      set status="${RUNTIME_STATUS.OFFLINE}"
      where service="${service}"
    `
    return mysql.query(sql)
  }

  async dispatch(path, method) {
    const worker = workerMgr.get(path, method)
    if (!worker) {
      throw new Error(`can't find the associated function`)
    }

    const { ctx } = this
    return worker.exec({ ctx: extractContext(ctx) })
  }

  async queryService(status) {
    const mysql = cronus.getMySQLClient()
    const sql = `
      select
      service, version
      from ${TABLE.SLS_RUNTIME_STATUS}
      where
      status="${status}"
    `
    return mysql.query(sql)
  }

  async recover() {
    const serviceList = await this.queryService(RUNTIME_STATUS.ONLINE)
    if (serviceList.length === 0) return
    serviceList.map(async ({ service, version }) => {
      await this.execDeployTask(service, version, null, true)
    })
  }

  async clearDir(dir) {
    const { dir: parentDir, name } = path.parse(dir)
    return new Promise((resolve, reject) => {
      shell.exec(`cd ${parentDir} && rm -rf ${name}`, (code, stdout, stderr) => {
        if (code !== 0) {
          const error = new Error(stderr)
          error.code = code
          return reject(error)
        }
        resolve(stdout)
      })
    })
  }
}
