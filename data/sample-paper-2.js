/* SAMPLE PAPER — replace with a real subject.
   Shows sections, shuffling and per-question marks. */
registerExam({
  id: 'sample-2',
  name: 'Sample Paper 2',
  icon: '📐',
  accent: '#12855c',
  description: 'A demo paper split into two sections, with the questions and options shuffled on every attempt.',
  durationMinutes: 20,
  passMark: 50,
  shuffleQuestions: false,
  shuffleOptions: true,
  sections: [
    { id: 'a', title: 'Section A — Theory' },
    { id: 'b', title: 'Section B — Applied' }
  ],
  questions: [
    {
      section: 'a',
      type: 'single',
      stem: 'In a right-angled triangle, the square of the hypotenuse equals the sum of the squares of the other two sides. This is known as:',
      options: ['Euclid\'s theorem', 'Pythagoras\' theorem', 'Thales\' theorem', 'The cosine rule'],
      answer: 'B',
      explanation: 'The cosine rule generalises it to any triangle; Pythagoras is the right-angled case.'
    },
    {
      section: 'a',
      type: 'truefalse',
      stem: 'Every prime number greater than 2 is odd.',
      answer: true,
      explanation: 'Any even number greater than 2 has 2 as a factor, so it cannot be prime.'
    },
    {
      section: 'b',
      type: 'single',
      stem: 'A car travels 150 km in 2 hours. What is its average speed?',
      options: ['50 km/h', '75 km/h', '100 km/h', '300 km/h'],
      answer: 'B',
      marks: 2,
      explanation: 'Average speed = distance / time = 150 / 2 = 75 km/h.'
    },
    {
      section: 'b',
      type: 'short',
      stem: 'What is the value of 15% of 240?',
      answer: ['36'],
      explanation: '0.15 × 240 = 36.'
    }
  ]
});
