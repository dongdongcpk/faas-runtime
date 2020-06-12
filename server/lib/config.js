const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')

const configPath = path.join(__dirname, '../../config/app.yaml')
module.exports = yaml.safeLoad(fs.readFileSync(configPath))