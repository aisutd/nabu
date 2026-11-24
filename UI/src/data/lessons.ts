export type Option = { id: string; text: string }
export type Question =
  | { id: string; kind: 'choice'; prompt: string; context?: string; picture?: 'apple' | 'back' | 'calendar'; options: Option[]; answer: string; explanation: string }
  | { id: string; kind: 'sentence'; prompt: string; tokens: Option[]; order: string[]; explanation: string }
  | { id: string; kind: 'text'; prompt: string; answers: string[]; explanation: string; retryHint: string }
  | { id: string; kind: 'speaking'; prompt: string; exerciseId: string; word: string; showReference: boolean }
  | { id: string; kind: 'handwriting'; prompt: string; letter: string }
  | { id: string; kind: 'signing'; prompt: string; letter: string; cue: string }

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

const foundations: Lesson[] = [
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
    id: 'say-it-aloud', title: 'Say it aloud', category: 'Pronunciation', symbol: '04', duration: '4 min', status: 'ready',
    description: 'Watch a mouth-movement example, then try the word yourself.',
    questions: [
      { id: 'say-back', kind: 'speaking', prompt: 'Practice “back” with the example.', exerciseId: 'say-back', word: 'back', showReference: true },
      { id: 'say-bad', kind: 'speaking', prompt: 'Practice “bad” with the example.', exerciseId: 'say-bad', word: 'bad', showReference: true },
      { id: 'say-june', kind: 'speaking', prompt: 'Now try “June” without watching first.', exerciseId: 'say-june', word: 'June', showReference: false },
    ],
  },
  {
    id: 'write-it-down', title: 'Write it down', category: 'Handwriting', symbol: '05', duration: '3 min', status: 'ready',
    description: 'Write the letters in “bad” and review each shape against its reference.',
    questions: ['b', 'a', 'd'].map((letter) => ({ id: `write-${letter}`, kind: 'handwriting', letter, prompt: `Write lowercase “${letter}”.` })),
  },
  {
    id: 'sign-it', title: 'Sign it', category: 'Sign language · ASL', symbol: '06', duration: '3 min', status: 'ready',
    description: 'Fingerspell the letters in “bad” using the live ASL recognizer.',
    questions: [
      { id: 'sign-b', kind: 'signing', letter: 'B', prompt: 'Fingerspell the letter B.', cue: 'Hold four fingers straight and together, with your thumb across your palm.' },
      { id: 'sign-a', kind: 'signing', letter: 'A', prompt: 'Fingerspell the letter A.', cue: 'Make a fist and rest your thumb alongside your index finger.' },
      { id: 'sign-d', kind: 'signing', letter: 'D', prompt: 'Fingerspell the letter D.', cue: 'Point your index finger up and touch your other fingertips to your thumb.' },
    ],
  },
]

const introductions: Lesson[] = [
  {
    id: 'greet-someone', title: 'Greet someone', category: 'Everyday phrases', symbol: '01', duration: '2 min', status: 'ready',
    description: 'Choose a greeting that fits the situation.',
    questions: [
      {
        id: 'morning', kind: 'choice', prompt: 'It’s 8 a.m. What do you say when you arrive?',
        options: [{ id: 'night', text: 'Good night!' }, { id: 'morning', text: 'Good morning!' }, { id: 'bye', text: 'Goodbye!' }],
        answer: 'morning', explanation: 'Use “Good morning” when you greet someone in the morning.',
      },
      {
        id: 'greet-back', kind: 'choice', prompt: 'A classmate says “Hi!” How can you greet them back?',
        options: [{ id: 'thanks', text: 'Thank you!' }, { id: 'bye', text: 'See you later!' }, { id: 'hello', text: 'Hello!' }],
        answer: 'hello', explanation: '“Hi” and “Hello” are both everyday greetings.',
      },
    ],
  },
  {
    id: 'say-your-name', title: 'Say your name', category: 'Word order', symbol: '02', duration: '2 min', status: 'ready',
    description: 'Introduce yourself with “My name is” or “I’m”.',
    questions: [
      {
        id: 'my-name', kind: 'sentence', prompt: 'You’re Maya. Build an introduction that begins with “My”.',
        tokens: [{ id: 'name', text: 'name' }, { id: 'maya', text: 'Maya' }, { id: 'my', text: 'My' }, { id: 'is', text: 'is' }, { id: 'dot', text: '.' }],
        order: ['my', 'name', 'is', 'maya', 'dot'], explanation: '“My name is Maya” is a complete introduction.',
      },
      {
        id: 'im', kind: 'choice', prompt: 'You’re Leo. Which reply tells someone your name?',
        options: [{ id: 'im', text: 'I’m Leo.' }, { id: 'youre', text: 'You’re Leo.' }, { id: 'ask', text: 'What’s your name?' }],
        answer: 'im', explanation: '“I’m” is short for “I am”. Use it before your name to introduce yourself.',
      },
    ],
  },
  {
    id: 'ask-someones-name', title: 'Ask someone’s name', category: 'Questions', symbol: '03', duration: '2 min', status: 'ready',
    description: 'Ask for a name and respond when someone introduces themselves.',
    questions: [
      {
        id: 'ask-name', kind: 'sentence', prompt: 'Build a question asking the person you’re talking to for their name.',
        tokens: [{ id: 'name', text: 'name' }, { id: 'your', text: 'your' }, { id: 'whats', text: 'What’s' }, { id: 'mark', text: '?' }],
        order: ['whats', 'your', 'name', 'mark'], explanation: '“What’s your name?” asks the other person to tell you their name.',
      },
      {
        id: 'meet', kind: 'choice', prompt: 'Someone just told you their name. Which reply fits?', context: 'Hi, I’m Sam.',
        options: [{ id: 'repeat', text: 'What’s your name?' }, { id: 'meet', text: 'Nice to meet you, Sam.' }, { id: 'night', text: 'Good night, Sam.' }],
        answer: 'meet', explanation: '“Nice to meet you” is a friendly response when someone introduces themselves.',
      },
    ],
  },
  {
    id: 'first-introduction', title: 'Meet a new classmate', category: 'Conversation check', symbol: '04', duration: '3 min', status: 'ready',
    description: 'Write your side of a short conversation from memory.',
    questions: [
      {
        id: 'introduce', kind: 'text', prompt: 'A classmate says “Hi! What’s your name?” Imagine your name is Alex. Write a short reply.',
        answers: ["I'm Alex", 'I am Alex', 'My name is Alex', "My name's Alex"],
        explanation: '“I’m Alex” and “My name is Alex” both tell your classmate your name.',
        retryHint: 'Try starting with “I’m” or “My name is”. A short greeting is optional.',
      },
      {
        id: 'ask-back', kind: 'text', prompt: 'Now write a question asking your classmate for their name.',
        answers: ["What's your name", 'What is your name', 'Could you tell me your name', 'Can you tell me your name', 'May I ask your name'],
        explanation: '“What’s your name?” is a direct way to ask. “Could you tell me your name?” also works.',
        retryHint: 'Try a question that includes “your name”.',
      },
    ],
  },
]

function choose(id: string, prompt: string, choices: [string, string, string], correct: 0 | 1 | 2, explanation: string): Question {
  return {
    id, kind: 'choice', prompt, explanation, answer: String(correct),
    options: choices.map((text, index) => ({ id: String(index), text })),
  }
}

function arrange(id: string, prompt: string, words: string[], order: number[]): Question {
  return {
    id, kind: 'sentence', prompt,
    tokens: words.map((text, index) => ({ id: String(index), text })),
    order: order.map(String),
    explanation: order.map((index) => words[index]).join(' '),
  }
}

function write(id: string, prompt: string, answers: string[], explanation: string, retryHint: string): Question {
  return { id, kind: 'text', prompt, answers, explanation, retryHint }
}

function say(word: string): Question {
  const exerciseId = `say-${word.toLowerCase().replaceAll(' ', '-')}`
  return { id: exerciseId, kind: 'speaking', prompt: `Say “${word}” clearly.`, exerciseId, word, showReference: false }
}

function writeLetter(word: string, letter: string): Question {
  const letterCase = letter === letter.toUpperCase() ? 'uppercase' : 'lowercase'
  return { id: `write-${letterCase}-${letter.toLowerCase()}`, kind: 'handwriting', letter, prompt: `Write ${letterCase} “${letter}” as it appears in “${word}”.` }
}

const handshapes = {
  A: 'Make a fist and rest your thumb alongside your index finger.',
  B: 'Hold four fingers straight and together, with your thumb across your palm.',
  C: 'Curve your fingers and thumb into the shape of a C.',
  D: 'Point your index finger up and touch your other fingertips to your thumb.',
  E: 'Curl four fingers down toward your thumb and fold your thumb across your palm.',
  M: 'Make a fist with your thumb tucked beneath your index, middle, and ring fingers.',
  N: 'Make a fist with your thumb tucked beneath your index and middle fingers.',
  P: 'Spread your index and middle fingers, place your thumb against the base of your middle finger, and tilt your hand so the middle finger points down.',
  T: 'Make a fist with your thumb between your index and middle fingers.',
  U: 'Hold your index and middle fingers straight up and together, with the other fingers folded down.',
  Y: 'Extend your thumb and little finger and fold your three middle fingers down.',
}

function spell(label: string, letters: (keyof typeof handshapes)[]): Question[] {
  return letters.map((letter, index) => ({
    id: `sign-${index + 1}-${letter.toLowerCase()}`, kind: 'signing', letter,
    prompt: `Fingerspell “${label}” · letter ${index + 1} of ${letters.length}: ${letter}`,
    cue: handshapes[letter],
  }))
}

function ready(id: string, title: string, category: string, minutes: number, description: string, questions: Question[]): Omit<Lesson, 'symbol'> {
  return { id, title, category, duration: `${minutes} min`, status: 'ready', description, questions }
}

function sequence(items: Omit<Lesson, 'symbol'>[]): Lesson[] {
  return items.map((lesson, index) => ({ ...lesson, symbol: String(index + 1).padStart(2, '0') }))
}

const foundationsWithReview = sequence([
  ...foundations,
  ready('foundations-check', 'Use your first words', 'Mixed review', 10,
    'Recall familiar words, rebuild a sentence, and practice saying, writing, and fingerspelling.', [
      choose('spoiled', 'The milk smells sour. Which word describes it?', ['June', 'bad', 'back'], 1, 'Food that has spoiled can be described as bad.'),
      choose('returned', 'Mia left and then returned. Which sentence fits?', ['Mia is back.', 'Mia is in June.', 'Mia will leave.'], 0, '“Back” here means she has returned.'),
      arrange('month', 'Say that June is a month.', ['a', 'month.', 'June', 'is'], [2, 3, 0, 1]),
      write('boat', 'Type the verb for scooping water out of a boat.', ['bail'], '“Bail” means to scoop water out in this context.', 'It begins with B and has four letters.'),
      say('back'), say('bad'), writeLetter('bad', 'b'), writeLetter('bad', 'd'), ...spell('BAD', ['B', 'A', 'D']),
    ]),
])

const introduceYourself = sequence([
  ...introductions.slice(0, 3),
  ready('say-an-introduction', 'Say an introduction', 'Pronunciation', 4, 'Record a greeting and a short introduction.', [
    say('Good morning'), say('My name is Maya'), say('Nice to meet you'),
  ]),
  ready('write-a-name', 'Write a name', 'Handwriting', 4, 'Practice three letters in the name Maya.', [
    writeLetter('Maya', 'M'), writeLetter('Maya', 'a'), writeLetter('Maya', 'y'),
  ]),
  ready('fingerspell-maya', 'Fingerspell Maya', 'ASL fingerspelling', 4, 'Use the camera to practice the four letters in Maya.', spell('MAYA', ['M', 'A', 'Y', 'A'])),
  introductions[3],
  ready('introduce-yourself-at-a-club', 'Introduce yourself at a club', 'Mixed review', 10, 'Meet someone at a morning club meeting and practice a name in several ways.', [
    choose('arrival', 'You arrive at a club meeting at 9 a.m. What can you say to greet the group?', ['Good night.', 'See you later.', 'Good morning.'], 2, '“Good morning” works when you arrive in the morning.'),
    write('guest', 'You’re Maya. Type a short reply to “Hello, what’s your name?”', ["I'm Maya", 'I am Maya', 'My name is Maya', "My name's Maya"], '“I’m Maya” introduces you in a few words.', 'Say “I’m” or “My name is” and give the name Maya.'),
    arrange('meet', 'Say that you’re glad to meet the other person.', ['meet', 'Nice', 'you.', 'to'], [1, 3, 0, 2]),
    say('Good morning'), say('My name is Maya'), say('Nice to meet you'),
    writeLetter('Maya', 'M'), writeLetter('Maya', 'y'), ...spell('MAYA', ['M', 'A', 'Y', 'A']),
  ]),
])

const requests = sequence([
  ready('identify-objects', 'Identify everyday objects', 'Vocabulary', 2, 'Name objects you can ask for.', [
    choose('cup', 'What do you drink water from?', ['A pencil', 'A cup', 'A door'], 1, 'A cup holds something you can drink.'),
    choose('pen', 'What could you use to sign a form?', ['A plate', 'A bag', 'A pen'], 2, 'A pen writes in ink.'),
    choose('bag', 'What could you carry your books in?', ['A bag', 'A cup', 'A pen'], 0, 'You can use a bag to carry things.'),
  ]),
  ready('ask-politely', 'Ask politely', 'Sentence building', 4, 'Build a request with “Can I have…?” and add “please”.', [
    arrange('cup', 'Ask for a cup.', ['a cup?', 'have', 'Can', 'I'], [2, 3, 1, 0]),
    arrange('pen', 'Ask for a pen and end with “please”.', ['I', 'please?', 'have', 'Can', 'a pen,'], [3, 0, 2, 4, 1]),
    choose('offer', 'Someone hands you the pen you asked for. What fits?', ['Which one?', 'Thank you.', 'Can I have a pen?'], 1, '“Thank you” acknowledges that someone helped you.'),
    write('bag', 'Ask for a bag in one sentence.', ['Can I have a bag', 'Could I have a bag', 'May I have a bag', 'Can I have a bag please', 'Could I have a bag please', 'May I have a bag please'], 'A question beginning with “Can I have” makes a request.', 'Try “Can I have” followed by “a bag”.'),
  ]),
  ready('choose-which-one', 'Answer “Which one?”', 'Reading', 2, 'Reply with the detail someone needs.', [
    choose('color', 'There’s a red pen and a blue pen. You want the blue pen. What do you say?', ['Both, please.', 'The red one, please.', 'The blue one, please.'], 2, '“The blue one” identifies the pen by its color.'),
    choose('quantity', 'The assistant asks “How many bags?” and you need two. What do you say?', ['Two, please.', 'The blue one.', 'A bag, please.'], 0, '“How many?” asks for a number.'),
  ]),
  ready('say-a-request', 'Say a request', 'Pronunciation', 4, 'Record requests for a cup and a pen, then say thank you.', [
    say('Can I have a cup'), say('Can I have a pen'), say('Thank you'),
  ]),
  ready('write-object-letters', 'Write letters in “cup” and “pen”', 'Handwriting', 4, 'Practice three lowercase shapes from the objects in this unit.', [
    writeLetter('cup', 'c'), writeLetter('cup', 'u'), writeLetter('pen', 'p'),
  ]),
  ready('fingerspell-cup', 'Fingerspell CUP', 'ASL fingerspelling', 4, 'Practice the letters of an object you can ask for.', spell('CUP', ['C', 'U', 'P'])),
  ready('borrow-a-pen', 'Borrow a pen', 'Mixed review', 10, 'Make a request, answer a follow-up, and work with the word “pen” across several activities.', [
    choose('need', 'You’re about to write, but you have nothing to write with. What should you ask for?', ['A cup', 'A pen', 'A bag'], 1, 'Ask for a pen when you need something to write with.'),
    write('request', 'Write a question asking to have a pen.', ['Can I have a pen', 'Could I have a pen', 'May I have a pen', 'Can I have a pen please', 'Could I have a pen please', 'May I have a pen please'], '“Can I have a pen?” makes your request clear.', 'Begin with “Can I have” and name the object.'),
    choose('follow-up', 'Your classmate asks “Black or blue?” You want black ink. What do you say?', ['The black one, please.', 'The blue one, please.', 'I want a cup.'], 0, '“The black one” identifies the pen you want.'),
    say('Can I have a pen'), say('Thank you'), writeLetter('pen', 'p'), writeLetter('pen', 'e'), ...spell('PEN', ['P', 'E', 'N']),
  ]),
])

const routines = sequence([
  ready('read-the-clock', 'Read the clock', 'Time', 2, 'Read whole and half hours in everyday situations.', [
    choose('seven', 'Your alarm says 7:00. What time is it?', ['Seven thirty', 'Eight o’clock', 'Seven o’clock'], 2, '7:00 is seven o’clock.'),
    choose('eight-thirty', 'The bus leaves at 8:30. Which phrase means 8:30?', ['Half past eight', 'Half past nine', 'Eight o’clock'], 0, 'Half past eight means thirty minutes after eight.'),
  ]),
  ready('describe-a-routine', 'Describe a routine', 'Sentence building', 4, 'Say when you wake up, eat, and leave home.', [
    arrange('wake', 'Say you wake up at seven.', ['at seven.', 'wake', 'I', 'up'], [2, 1, 3, 0]),
    arrange('eat', 'Say you eat breakfast at eight.', ['breakfast', 'I', 'at eight.', 'eat'], [1, 3, 0, 2]),
    choose('leave', 'Which sentence tells someone when you go out?', ['I eat breakfast.', 'I leave home at nine.', 'It’s half past eight.'], 1, '“I leave home at nine” names an action and gives a time.'),
    arrange('home', 'Say you come home at six.', ['home', 'at six.', 'I', 'come'], [2, 3, 0, 1]),
  ]),
  ready('order-your-day', 'Put your day in order', 'Reading', 2, 'Use “before” and “after” to follow a schedule.', [
    choose('before', '“I eat before I leave.” What happens first?', ['Leaving', 'Eating', 'Both happen together'], 1, '“Before” puts eating first.'),
    choose('after', '“I call Sam after lunch.” What happens first?', ['Calling Sam', 'Both happen together', 'Lunch'], 2, '“After lunch” puts the call later than lunch.'),
  ]),
  ready('say-your-routine', 'Say your routine', 'Pronunciation', 4, 'Record three short statements about a daily routine.', [
    say('I wake up early'), say('I eat breakfast'), say('I leave home after breakfast'),
  ]),
  ready('write-day-letters', 'Write letters in “day”', 'Handwriting', 4, 'Practice the lowercase shapes that make up “day”.', [
    writeLetter('day', 'd'), writeLetter('day', 'a'), writeLetter('day', 'y'),
  ]),
  ready('fingerspell-day', 'Fingerspell DAY', 'ASL fingerspelling', 4, 'Form each letter in “day” with the camera.', spell('DAY', ['D', 'A', 'Y'])),
  ready('share-a-morning-schedule', 'Share a morning schedule', 'Mixed review', 10, 'Read a schedule and describe what happens, then practice letters from “day”.', [
    choose('time', 'Maya wakes at 7:30 and leaves at 9:00. When does she wake up?', ['At seven thirty', 'At seven', 'At nine'], 0, '7:30 is seven thirty.'),
    choose('order', 'Maya eats at eight and leaves at nine. What comes last?', ['Waking up', 'Eating', 'Leaving'], 2, 'Nine comes after seven thirty and eight.'),
    arrange('tell', 'You are Maya. Say when you leave home.', ['home', 'I', 'at nine.', 'leave'], [1, 3, 0, 2]),
    write('wake', 'Write a sentence saying you wake up at 7:30.', ['I wake up at 7:30', 'I wake up at seven thirty', 'I wake up at half past seven'], '“I wake up at seven thirty” describes your wake-up time.', 'Start with “I wake up at” and give the time.'),
    say('I eat breakfast'), say('I leave home after breakfast'), writeLetter('day', 'd'), writeLetter('day', 'y'), ...spell('DAY', ['D', 'A', 'Y']),
  ]),
])

const directions = sequence([
  ready('read-street-directions', 'Understand directions', 'Vocabulary', 2, 'Recognize “left”, “right”, and “straight”.', [
    choose('straight', 'If you go straight, what do you do?', ['Keep going in the same direction', 'Turn right', 'Turn around'], 0, '“Go straight” means continue without turning.'),
    choose('right', 'Which instruction means to take the road on your right?', ['Turn left.', 'Go straight.', 'Turn right.'], 2, '“Turn right” tells you which way to turn.'),
  ]),
  ready('ask-for-directions', 'Ask where to go', 'Sentence building', 4, 'Build questions that ask where a place is.', [
    arrange('station', 'Ask where the bus stop is.', ['stop?', 'Where', 'the', 'is', 'bus'], [1, 3, 2, 4, 0]),
    arrange('library', 'Ask how to get to the library.', ['I', 'library?', 'do', 'get to', 'How', 'the'], [4, 2, 0, 3, 5, 1]),
    choose('next-to', 'The library is next to the bank. Where should you look?', ['Inside the bank', 'Beside the bank', 'Behind the bank'], 1, '“Next to” means beside.'),
    arrange('repeat', 'Ask someone to repeat their directions.', ['repeat', 'you', 'that?', 'Could'], [3, 1, 0, 2]),
  ]),
  ready('follow-two-steps', 'Follow two steps', 'Reading', 2, 'Work out the order of two directions.', [
    choose('first', '“Go straight, then turn left.” What comes first?', ['Turn left', 'Turn right', 'Go straight'], 2, '“Then” introduces what happens next.'),
    choose('after-bank', '“Turn right after the bank.” When do you turn?', ['Once you pass the bank', 'Before you reach the bank', 'At the previous corner'], 0, 'Keep going until you have passed the bank.'),
  ]),
  ready('say-directions', 'Say directions', 'Pronunciation', 4, 'Record a question and two common directions.', [
    say('Where is the bus stop'), say('Go straight'), say('Turn left'),
  ]),
  ready('write-map-letters', 'Write letters in “map”', 'Handwriting', 4, 'Compare three lowercase letters with their references.', [
    writeLetter('map', 'm'), writeLetter('map', 'a'), writeLetter('map', 'p'),
  ]),
  ready('fingerspell-map', 'Fingerspell MAP', 'ASL fingerspelling', 4, 'Practice forming each letter in “map”.', spell('MAP', ['M', 'A', 'P'])),
  ready('find-the-bus-stop', 'Find the bus stop', 'Mixed review', 10, 'Ask for directions, interpret a new route, and practice the letters in “map”.', [
    write('ask', 'Write a question asking where the bus stop is.', ['Where is the bus stop', "Where's the bus stop", 'Could you tell me where the bus stop is', 'How do I get to the bus stop', 'Excuse me where is the bus stop'], '“Where is the bus stop?” clearly names your destination.', 'Start your question with “Where is” and name the place.'),
    choose('route', '“Turn left at the café, then look beside the library.” Where is the bus stop?', ['Inside the café', 'Beside the library', 'Before the café'], 1, '“Beside the library” gives the final location.'),
    arrange('instruct', 'Tell someone to go straight and then turn left.', ['turn', 'Go', 'then', 'left.', 'straight,'], [1, 4, 2, 0, 3]),
    say('Go straight'), say('Turn left'), writeLetter('map', 'm'), writeLetter('map', 'p'), ...spell('MAP', ['M', 'A', 'P']),
  ]),
])

const cafe = sequence([
  ready('read-a-menu', 'Read a café menu', 'Vocabulary', 2, 'Identify drinks and work out what you can buy.', [
    choose('drink', 'The menu lists tea, toast, and soup. Which is a drink?', ['Tea', 'Toast', 'Soup'], 0, 'Tea is a drink.'),
    choose('budget', 'Tea costs $2 and soup costs $5. You have $3. What can you buy?', ['Soup', 'Both', 'Tea'], 2, 'Tea costs less than three dollars.'),
  ]),
  ready('build-an-order', 'Build an order', 'Sentence building', 4, 'Order food or drink and ask about the price.', [
    arrange('tea', 'Order tea politely.', ['please.', 'I’d', 'tea,', 'like'], [1, 3, 2, 0]),
    arrange('price', 'Ask how much the soup costs.', ['the soup?', 'is', 'How', 'much'], [2, 3, 1, 0]),
    choose('water', 'You’d like water as well. What can you say?', ['I’d like water, too.', 'No water, please.', 'Is that tea?'], 0, '“Too” means you want to add water to your order.'),
    arrange('done', 'Tell the server your order is finished.', ['all,', 'please.', 'That’s'], [2, 0, 1]),
  ]),
  ready('answer-the-server', 'Answer the server', 'Reading', 2, 'Recognize common questions you hear when ordering.', [
    choose('here', 'The server asks “For here or to go?” You’ll eat at the café. What do you say?', ['To go, please.', 'For here, please.', 'The soup, please.'], 1, '“For here” means you will eat at the café.'),
    choose('else', 'The server asks “Anything else?” You’ve ordered everything you want. What do you say?', ['How much is the soup?', 'For here, please.', 'No, that’s all.'], 2, '“That’s all” lets the server know your order is complete.'),
  ]),
  ready('say-a-cafe-order', 'Say a café order', 'Pronunciation', 4, 'Record an order, a price question, and a reply.', [
    say('Can I have some tea'), say('How much is the soup'), say('For here please'),
  ]),
  ready('write-tea-letters', 'Write letters in “tea”', 'Handwriting', 4, 'Practice the three lowercase letters you see on the menu.', [
    writeLetter('tea', 't'), writeLetter('tea', 'e'), writeLetter('tea', 'a'),
  ]),
  ready('fingerspell-tea', 'Fingerspell TEA', 'ASL fingerspelling', 4, 'Practice all three letters in “tea”.', spell('TEA', ['T', 'E', 'A'])),
  ready('order-at-a-cafe', 'Order at a café', 'Mixed review', 10, 'Read a menu, place an order, and respond to the server.', [
    choose('menu', 'Tea is $2, soup is $4, and toast is $3. What costs exactly $4?', ['Tea', 'Toast', 'Soup'], 2, 'The menu lists soup at four dollars.'),
    write('order', 'You want tea. Type a polite order.', ['Can I have some tea', 'Can I have some tea please', 'Can I have tea please', "I'd like tea", "I'd like tea please", "I'd like some tea", "I'd like some tea please", 'I would like tea', 'I would like some tea', 'Tea please'], '“I’d like tea, please” is one way to order.', 'Try “I’d like” followed by what you want.'),
    choose('where', 'The server asks “For here or to go?” You need to leave soon. What do you say?', ['To go, please.', 'For here, please.', 'How much is it?'], 0, '“To go” means you want to take the order with you.'),
    arrange('close', 'Tell the server you’re done ordering and thank them.', ['all,', 'That’s', 'thank', 'you.'], [1, 0, 2, 3]),
    say('Can I have some tea'), say('How much is the soup'), writeLetter('tea', 't'), writeLetter('tea', 'e'), ...spell('TEA', ['T', 'E', 'A']),
  ]),
])

export const lessonUnits = [
  { title: 'Foundations', goal: 'Recognize, build, and practice your first words.', lessons: foundationsWithReview },
  { title: 'Introduce yourself', goal: 'Greet someone, give your name, and ask for theirs.', lessons: introduceYourself },
  { title: 'Make a request', goal: 'Ask for an everyday object and answer a follow-up question.', lessons: requests },
  { title: 'Talk about your day', goal: 'Tell the time and put everyday activities in order.', lessons: routines },
  { title: 'Find your way', goal: 'Ask for directions and follow a short route.', lessons: directions },
  { title: 'Order at a café', goal: 'Read a menu, order politely, and answer the server.', lessons: cafe },
]

export const lessons = lessonUnits.flatMap((unit) => unit.lessons)
