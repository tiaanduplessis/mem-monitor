'use strict'

const log = require('log-update')
const Table = require('cli-table')
const titleCase = require('title-case')

const getMemoryUsage = function getMemoryUsage () {
  const table = new Table({ head: ['Type', 'MB'], colWidths: [30, 30] })
  const used = process.memoryUsage()
  Object.keys(used).forEach(key => {
    const prop = Math.round(used[key] / (1024 * 1024) * 1000) / 1000
    table.push({ [titleCase(key)]: prop })
  })

  log(table)
}

const memMonitor = function memMonitor (ms = 3000, opts = {}) {
  getMemoryUsage()
  const interval = setInterval(getMemoryUsage, ms)
}

module.exports = memMonitor
