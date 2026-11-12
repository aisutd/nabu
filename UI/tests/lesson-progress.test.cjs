const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

function load(file, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../src/data', file), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  vm.runInNewContext(code, { exports, require: (name) => dependencies[name] }, { filename: file })
  // Move plain data into this realm so strict assertions compare normal objects.
  return exports
}
const data = load('lessons.ts')
const progress = load('lesson_progress.ts', { './lessons': data })
const lesson = data.lessons[0]
const plain = (value) => JSON.parse(JSON.stringify(value))
const attempt = (questionId, values = {}) => ({ questionId, answerIds: ['bad'], answer: 'bad', correct: true, skipped: false, createdAt: '2026-11-11T12:00:00Z', ...values })

test('malformed and out-of-range stored progress is discarded', () => {
  for (const raw of ['broken', 'null', '[]', JSON.stringify({ [lesson.id]: { cursor: 99, completed: false, attempts: [] } })]) {
    assert.deepEqual(plain(progress.parseProgress(raw)), {})
  }
})
test('coming-soon lessons never restore completion', () => {
  assert.deepEqual(plain(progress.parseProgress(JSON.stringify({ 'write-it-down': { cursor: 0, completed: true, attempts: [] } }))), {})
})
test('resume retains attempts and cursor while filtering invalid question IDs', () => {
  const saved = { [lesson.id]: { cursor: 1, completed: false, attempts: [attempt('apple'), attempt('not-a-question')] } }
  const restored = progress.parseProgress(JSON.stringify(saved))[lesson.id]
  assert.equal(restored.cursor, 1)
  assert.equal(restored.attempts.length, 1)
})
test('completion is set only when the final question is advanced', () => {
  let state = progress.emptyProgress()
  state = progress.advanceProgress(state, lesson)
  assert.equal(state.completed, false)
  state = progress.advanceProgress(progress.advanceProgress(state, lesson), lesson)
  assert.equal(state.completed, true)
  assert.equal(progress.advanceProgress(state, lesson).cursor, lesson.questions.length)
})
test('summary counts retries as attempts, skipped questions separately', () => {
  const state = { cursor: 3, completed: true, attempts: [attempt('apple', { correct: false }), attempt('apple'), attempt('back'), attempt('june', { correct: null, skipped: true })] }
  assert.deepEqual(plain(progress.lessonSummary(state, lesson)), { attempts: 3, reviewed: 2, skipped: 1 })
})
test('unit uses the existing backend exercise IDs for all speaking questions', () => {
  const words = new Set(['bad', 'back', 'bail', 'june', 'kent'])
  for (const lesson of data.lessons) {
    assert.equal(lesson.status === 'ready', lesson.questions.length > 0)
    for (const question of lesson.questions) {
      if (question.kind === 'speaking') assert.ok(words.has(question.exerciseId.replace('say-', '')))
      if (question.kind === 'choice') assert.ok(question.options.some((option) => option.id === question.answer))
      if (question.kind === 'sentence') assert.deepEqual([...question.order].sort(), plain(question.tokens.map((token) => token.id).sort()))
    }
  }
})
