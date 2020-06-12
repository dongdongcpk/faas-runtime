const fs = require('fs')
const yaml = require('js-yaml')

module.exports = {
  loadYaml(filePath) {
    return yaml.safeLoad(fs.readFileSync(filePath))
  }
}
