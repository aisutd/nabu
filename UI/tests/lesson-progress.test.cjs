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
test('a legacy preview record does not restore completion for a now-playable lesson', () => {
  assert.deepEqual(plain(progress.parseProgress(JSON.stringify({ 'write-it-down': { cursor: 0, completed: true, attempts: [] } }))), {})
})
test('resume retains attempts and cursor while filtering invalid question IDs', () => {
  const saved = { [lesson.id]: { cursor: 1, completed: false, attempts: [attempt('apple'), attempt('not-a-question')] } }
  const restored = progress.parseProgress(JSON.stringify(saved))[lesson.id]
  assert.equal(restored.cursor, 1)
  assert.equal(restored.attempts.length, 1)
})
test('completion is set only when the final question is advanced', () => {
  let state = { ...progress.emptyProgress(), attempts: lesson.questions.map((question) => attempt(question.id)) }
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
test('catalog questions have valid answer and exercise IDs', () => {
  for (const lesson of data.lessons) {
    assert.equal(lesson.status === 'ready', lesson.questions.length > 0)
    for (const question of lesson.questions) {
      if (question.kind === 'speaking') assert.equal(question.exerciseId, `say-${question.word.toLowerCase().replaceAll(' ', '-')}`)
      if (question.kind === 'choice') assert.ok(question.options.some((option) => option.id === question.answer))
      if (question.kind === 'sentence') assert.deepEqual([...question.order].sort(), plain(question.tokens.map((token) => token.id).sort()))
    }
  }
})

test('each of the six units has practice in all three modalities and a range of lesson lengths', () => {
  assert.equal(data.lessonUnits.length, 6)
  assert.equal(new Set(data.lessons.map(({ id }) => id)).size, data.lessons.length)
  for (const unit of data.lessonUnits) {
    assert.ok(unit.lessons.length >= 7, unit.title)
    const kinds = new Set(unit.lessons.flatMap((lesson) => lesson.questions.map(({ kind }) => kind)))
    for (const kind of ['speaking', 'handwriting', 'signing']) assert.ok(kinds.has(kind), unit.title)
    const durations = new Set(unit.lessons.map(({ duration }) => duration))
    for (const duration of ['2 min', '4 min', '10 min']) assert.ok(durations.has(duration), unit.title)
    for (const lesson of unit.lessons) {
      assert.equal(new Set(lesson.questions.map(({ id }) => id)).size, lesson.questions.length, lesson.title)
      for (const question of lesson.questions) {
        if (question.kind === 'signing') assert.ok(question.cue, question.letter)
      }
    }
  }
})

test('speaking requires a recognized match to the displayed word', () => {
  const speakingLesson = data.lessons.find((item) => item.id === 'say-it-aloud')
  const question = speakingLesson.questions[0]
  const matching = attempt(question.id, { correct: null, speaking: { match: true, heard: ' BACK ', expected: 'back', hasResult: true } })
  assert.equal(progress.canContinueQuestion(question, matching), true)
  for (const speaking of [undefined, { ...matching.speaking, match: false }, { ...matching.speaking, heard: 'bad' }, { ...matching.speaking, heard: '' }, { ...matching.speaking, expected: 'bad' }, { match: null, hasResult: true }]) {
    const failed = { ...matching, speaking }
    assert.equal(progress.canContinueQuestion(question, failed), false)
    const state = { cursor: 0, completed: false, attempts: [failed] }
    assert.equal(progress.advanceProgress(state, speakingLesson).cursor, 0)
  }
  assert.equal(progress.canContinueQuestion(question, { ...matching, skipped: true }), false)
  assert.equal(progress.advanceProgress({ cursor: 0, completed: false, attempts: [matching] }, speakingLesson).cursor, 1)
})

test('explicit speaking skip advances without enabling normal Continue', () => {
  const lesson = data.lessons.find((item) => item.id === 'say-it-aloud')
  const state = { cursor: 0, completed: false, attempts: [attempt(lesson.questions[0].id, { correct: null, skipped: true })] }
  assert.equal(progress.advanceProgress(state, lesson).cursor, 0)
  const skipped = progress.advanceProgress(state, lesson, true)
  assert.equal(skipped.cursor, 1)
  assert.equal(progress.lessonSummary(skipped, lesson).skipped, 1)
})


test('signing continues only when the recognizer matches the requested letter', () => {
  const lesson = data.lessons.find((item) => item.id === 'sign-it')
  const question = lesson.questions[0]
  const matching = attempt(question.id, { answer: question.letter, answerIds: [] })
  const mismatch = { ...matching, answer: 'C', correct: false }
  assert.equal(progress.canContinueQuestion(question, matching), true)
  assert.equal(progress.canContinueQuestion(question, mismatch), false)
  assert.equal(progress.canContinueQuestion(question, { ...mismatch, correct: true }), false)
  assert.equal(progress.advanceProgress({ cursor: 0, completed: false, attempts: [matching] }, lesson).cursor, 1)
})

test('handwriting requires a saved review that meets the shape goal', () => {
  const lesson = data.lessons.find((item) => item.id === 'write-it-down')
  const question = lesson.questions[0]
  const reviewed = attempt(question.id, { answer: question.letter, answerIds: [], correct: null, handwriting: { similarity: 90 } })
  assert.equal(progress.canContinueQuestion(question, reviewed), true)
  assert.equal(progress.canContinueQuestion(question, { ...reviewed, handwriting: undefined }), false)
  const belowGoal = { ...reviewed, handwriting: { similarity: 89 } }
  assert.equal(progress.canContinueQuestion(question, belowGoal), false)
  assert.equal(progress.advanceProgress({ cursor: 0, completed: false, attempts: [belowGoal] }, lesson).cursor, 0)
  assert.equal(progress.canContinueQuestion(question, { ...reviewed, handwriting: { similarity: 105 } }), false)
  const saved = { [lesson.id]: { cursor: 0, completed: false, attempts: [reviewed] } }
  const restored = progress.parseProgress(JSON.stringify(saved))[lesson.id]
  assert.equal(progress.advanceProgress(restored, lesson).cursor, 1)
})

test('signing and handwriting can be explicitly skipped', () => {
  for (const id of ['sign-it', 'write-it-down']) {
    const lesson = data.lessons.find((item) => item.id === id)
    const skipped = attempt(lesson.questions[0].id, { answer: '', answerIds: [], correct: null, skipped: true })
    const state = { cursor: 0, completed: false, attempts: [skipped] }
    assert.equal(progress.advanceProgress(state, lesson).cursor, 0)
    assert.equal(progress.advanceProgress(state, lesson, true).cursor, 1)
  }
})
