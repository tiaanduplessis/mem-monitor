'use strict'

const assert = require('assert')
const path = require('path')
const spawnSync = require('child_process').spawnSync
// An optional package root also allows this suite to exercise the packed artifact.
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'))
const fixture = path.join(__dirname, 'fixtures/capture.js')
let scenarios = 0
let referenceFrames

function check (widths, interval) {
  const result = spawnSync(process.execPath, [fixture, root, JSON.stringify(widths), interval], {
    encoding: 'utf8',
    timeout: 5000
  })
  assert.ifError(result.error)
  assert.strictEqual(result.status, 0, result.stderr)
  const output = JSON.parse(result.stdout)
  assert.strictEqual(output.delay, interval === 'default' ? 3000 : Number(interval))
  assert.strictEqual(output.calls, widths.length, 'sample memory on every render')
  assert.strictEqual(output.frames.length, widths.length)
  const expectedCursor = widths[0] === null ? '' : '\u001b[?25l'.repeat(widths.length) + '\u001b[?25h'
  assert.strictEqual(output.cursorWrites.join(''), expectedCursor, 'restore the captured cursor')

  output.frames.forEach(function (frame, index) {
    const plain = frame.replace(/\u001b\[[0-9;]*[A-Za-z]/g, '')
    const width = widths[index] || 80
    const lines = plain.split('\n')
    assert.strictEqual(lines.pop(), '', 'end every frame with a newline')
    lines.forEach(function (line) {
      assert(line.length <= width, 'wrap every table line to ' + width + ' columns: ' + line)
    })
    const erased = (frame.match(/\u001b\[(?:2)?K/g) || []).length
    const previousLines = index === 0 ? 0 : output.frames[index - 1].split('\n').length
    assert.strictEqual(erased, previousLines, 'erase all lines of the previous frame')
    if (referenceFrames) {
      assert.strictEqual(plain.replace(/\n/g, ''), referenceFrames[index], 'preserve table content and spacing when wrapping')
    }
    if (width >= 63) {
      assert(plain.indexOf('Type') !== -1 && plain.indexOf('MB') !== -1)
      assert(new RegExp('Rss\\s*│\\s*' + (index + 1) + '\\.234\\s*│').test(plain))
      assert(/Heap Total\s*│\s*2\s*│/.test(plain))
      assert(/Heap Used\s*│\s*0\s*│/.test(plain))
      assert(/External\s*│\s*0\.001\s*│/.test(plain))
    }
  })
  if (!referenceFrames) {
    referenceFrames = output.frames.map(function (frame) {
      return frame.replace(/\u001b\[[0-9;]*[A-Za-z]/g, '').replace(/\n/g, '')
    })
  }
  scenarios++
}

check([80, 80, 80], 'default')
check([20, 20, 20], '37')
check([null, null], '250')
check([80, 20, 40], '100')
process.stdout.write('Passed ' + scenarios + ' terminal scenarios\n')
