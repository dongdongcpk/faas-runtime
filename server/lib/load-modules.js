const path = require('path')
const globby = require('globby')
const camelcase = require('camelcase')

function loadModules(dir, name) {
  dir = path.join(dir, name)
  return globby
    .sync('**/*.js', {
      cwd: dir,
      ignore: ['!**/*.test.js', '__tests__/**/*', '__mocks__/**/*']
    })
    .map(file => {
      return {
        exports: require(path.join(dir, file)),
        name: camelcase(file.slice(0, -3).replace(/\//g, '.'))
      }
    })
}

module.exports = loadModules
