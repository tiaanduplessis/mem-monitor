'use strict'

// Run only in a child process: never start a real timer or write terminal controls.
const assert = require('assert')
const root = process.argv[2]
const widths = JSON.parse(process.argv[3])
const interval = process.argv[4]
const frames = []
const cursorWrites = []
const originalWrite = process.stdout.write
const originalErrorWrite = process.stderr.write
const originalInterval = global.setInterval
const originalMemoryUsage = process.memoryUsage
let callback
let delay
let calls = 0
let log

process.stdout.write = function (value) {
  frames.push(String(value))
  return true
}
process.stderr.write = function (value) {
  cursorWrites.push(String(value))
  return true
}
// Exercise cursor handling against captured output, without using a real TTY.
process.stderr.isTTY = widths[0] !== null
process.stdout.isTTY = widths[0] !== null
process.stdout.columns = widths[0] === null ? undefined : widths[0]
global.setInterval = function (fn, ms) {
  assert.strictEqual(callback, undefined, 'schedule exactly one interval')
  callback = fn
  delay = ms
  return { fakeTimer: true }
}
process.memoryUsage = function () {
  calls++
  return { rss: 1293943 + (calls - 1) * 1048576, heapTotal: 2097152, heapUsed: 0, external: 1049 }
}

try {
  const monitor = require(root)
  // Resolve from the package itself, including npm's hoisted consumer layout.
  log = require.cache[require.resolve(root)].require('log-update')
  assert.strictEqual(typeof monitor, 'function')
  assert.strictEqual(frames.length, 0, 'import must not start monitoring')
  assert.strictEqual(callback, undefined, 'import must not schedule a timer')
  if (interval === 'default') monitor()
  else monitor(Number(interval))
  assert.strictEqual(frames.length, 1, 'render immediately')
  assert.strictEqual(typeof callback, 'function')
  widths.slice(1).forEach(function (width) {
    process.stdout.columns = width === null ? undefined : width
    callback()
  })
  log.done()
} finally {
  process.stdout.write = originalWrite
  process.stderr.write = originalErrorWrite
  global.setInterval = originalInterval
  process.memoryUsage = originalMemoryUsage
  process.stderr.isTTY = false
}

process.stdout.write(JSON.stringify({ frames: frames, delay: delay, calls: calls, cursorWrites: cursorWrites }))
