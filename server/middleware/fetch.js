const axios = require('axios')
const http = require('http')
const https = require('https')
module.exports = axios.create({
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true })
})
