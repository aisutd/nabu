export type Option = { id: string; text: string }
export type Question =
  | { id: string; kind: 'choice'; prompt: string; context?: string; picture?: 'apple' | 'back' | 'calendar'; options: Option[]; answer: string; explanation: string }
  | { id: string; kind: 'sentence'; prompt: string; tokens: Option[]; order: string[]; explanation: string }
  | { id: string; kind: 'speaking'; prompt: string; exerciseId: string; word: string; showReference: boolean }

export type Lesson = {
  id: string
  title: string
  description: string
  category: string
  symbol: string
  duration: string
  status: 'ready' | 'coming-soon'
  questions: Question[]
  preview?: string
}

export const unitWords = ['bad', 'back', 'bail', 'June', 'Kent']

export const lessons: Lesson[] = [
  {
    id: 'meet-the-words', title: 'Meet the words', category: 'Picture matching', symbol: '01', duration: '2 min', status: 'ready',
    description: 'Connect a picture with an English word.',
    questions: [
      { id: 'apple', kind: 'choice', prompt: 'This apple is no longer good to eat. Which word describes it?', picture: 'apple', options: [{ id: 'bad', text: 'bad' }, { id: 'back', text: 'back' }, { id: 'june', text: 'June' }], answer: 'bad', explanation: '“Bad” can describe food that is spoiled or no longer good to eat.' },
      { id: 'back', kind: 'choice', prompt: 'Which part of the person is facing you?', picture: 'back', options: [{ id: 'bail', text: 'bail' }, { id: 'back', text: 'back' }, { id: 'june', text: 'June' }], answer: 'back', explanation: 'Your back is the rear part of your body, opposite your chest.' },
      { id: 'june', kind: 'choice', prompt: 'Which word names the sixth month of the year?', picture: 'calendar', options: [{ id: 'kent', text: 'Kent' }, { id: 'bad', text: 'bad' }, { id: 'june', text: 'June' }], answer: 'june', explanation: 'June is the sixth month. Month names begin with a capital letter.' },
    ],
  },
  {
    id: 'find-the-meaning', title: 'Find the meaning', category: 'Word meanings', symbol: '02', duration: '2 min', status: 'ready',
    description: 'Use the sentence to discover what each word means.',
    questions: [
      { id: 'bail', kind: 'choice', prompt: 'What does “bail” mean in this sentence?', context: 'We use a bucket to bail water out of the boat.', options: [{ id: 'remove', text: 'Remove water from the boat' }, { id: 'paint', text: 'Paint the boat' }, { id: 'fill', text: 'Fill the boat with water' }], answer: 'remove', explanation: 'Here, “bail” means to scoop water out of a boat. A word can have other meanings in different contexts.' },
      { id: 'kent', kind: 'choice', prompt: 'What does “Kent” refer to here?', context: 'My friend Kent is back.', options: [{ id: 'month', text: 'A month of the year' }, { id: 'person', text: 'A person’s name' }, { id: 'action', text: 'An action' }], answer: 'person', explanation: 'In this sentence, Kent is a person’s name. Names begin with a capital letter.' },
      { id: 'returned', kind: 'choice', prompt: 'What does “back” mean here?', context: 'Kent went away yesterday. Now he is back.', options: [{ id: 'returned', text: 'He has returned' }, { id: 'left', text: 'He is leaving' }, { id: 'month', text: 'It is a new month' }], answer: 'returned', explanation: '“Back” can mean returned to a place. It can also name a part of the body.' },
    ],
  },
  {
    id: 'build-a-sentence', title: 'Build a sentence', category: 'Word order', symbol: '03', duration: '3 min', status: 'ready',
    description: 'Put familiar words in the right order.',
    questions: [
      { id: 'kent-back', kind: 'sentence', prompt: 'Build a sentence saying that Kent has returned.', tokens: [{ id: 'back', text: 'back' }, { id: 'kent', text: 'Kent' }, { id: 'dot', text: '.' }, { id: 'is', text: 'is' }], order: ['kent', 'is', 'back', 'dot'], explanation: 'Kent is back.' },
      { id: 'june-month', kind: 'sentence', prompt: 'Build a sentence describing June.', tokens: [{ id: 'month', text: 'month' }, { id: 'a', text: 'a' }, { id: 'june', text: 'June' }, { id: 'dot', text: '.' }, { id: 'is', text: 'is' }], order: ['june', 'is', 'a', 'month', 'dot'], explanation: 'June is a month.' },
      { id: 'bad-apple', kind: 'sentence', prompt: 'Build a sentence about an apple that is spoiled.', tokens: [{ id: 'is', text: 'is' }, { id: 'bad', text: 'bad' }, { id: 'this', text: 'This' }, { id: 'dot', text: '.' }, { id: 'apple', text: 'apple' }], order: ['this', 'apple', 'is', 'bad', 'dot'], explanation: 'This apple is bad.' },
    ],
  },
  {
    id: 'say-it-aloud', title: 'Say it aloud', category: 'Pronunciation', symbol: '04', duration: '3 min', status: 'ready',
    description: 'Watch a mouth-movement example, then try the word yourself.',
    questions: [
      { id: 'say-back', kind: 'speaking', prompt: 'Practice “back” with the example.', exerciseId: 'say-back', word: 'back', showReference: true },
      { id: 'say-bad', kind: 'speaking', prompt: 'Practice “bad” with the example.', exerciseId: 'say-bad', word: 'bad', showReference: true },
      { id: 'say-june', kind: 'speaking', prompt: 'Now try “June” without watching first.', exerciseId: 'say-june', word: 'June', showReference: false },
    ],
  },
  {
    id: 'write-it-down', title: 'Write it down', category: 'Handwriting', symbol: '05', duration: 'Coming soon', status: 'coming-soon', questions: [],
    description: 'A place to practice writing the words you have learned.',
    preview: 'You will write words such as “back” and “June” on a canvas. Handwriting input and feedback are not connected yet. This preview does not count as a completed lesson.',
  },
  {
    id: 'sign-it', title: 'Sign it', category: 'Sign language · ASL', symbol: '06', duration: 'Coming soon', status: 'coming-soon', questions: [],
    description: 'Explore another way to communicate.',
    preview: 'An ASL activity will appear here when the sign-language module is ready. ASL is a language with its own grammar; this placeholder does not teach or assess signs and cannot be completed.',
  },
]
