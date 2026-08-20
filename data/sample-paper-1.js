/* SAMPLE PAPER — replace with a real subject.
   Shows every supported question type. See README.md for the full format. */
registerExam({
  id: 'sample-1',
  name: 'Sample Paper 1',
  icon: '🧪',
  accent: '#2f5bd6',
  description: 'A short demo paper showing all four question types: single answer, multiple answer, true/false and short written answer.',
  durationMinutes: 15,
  passMark: 60,
  shuffleQuestions: false,
  shuffleOptions: false,
  questions: [
    {
      type: 'single',
      stem: 'Which planet in the Solar System has the shortest day?',
      options: ['Mercury', 'Earth', 'Jupiter', 'Neptune'],
      answer: 'C',
      explanation: 'Jupiter rotates once in just under 10 hours — the fastest rotation of any planet in the Solar System.'
    },
    {
      type: 'multi',
      stem: 'Which TWO of the following are noble gases?',
      options: ['Nitrogen', 'Argon', 'Chlorine', 'Neon'],
      answer: ['B', 'D'],
      explanation: 'Argon and neon are in Group 18. Nitrogen is Group 15 and chlorine is a halogen.'
    },
    {
      type: 'truefalse',
      stem: 'Water boils at a lower temperature at high altitude than at sea level.',
      answer: true,
      explanation: 'Atmospheric pressure falls with altitude, so the vapour pressure of water reaches it at a lower temperature.'
    },
    {
      type: 'short',
      stem: 'Name the organelle that is the main site of ATP production in a eukaryotic cell.',
      answer: ['mitochondrion', 'mitochondria'],
      explanation: 'Oxidative phosphorylation occurs on the inner mitochondrial membrane.'
    },
    {
      type: 'single',
      passage: 'A patient reports that a cup of coffee taken at 8 pm keeps them awake until 2 am, while the same cup at 8 am has no effect on that night\'s sleep.',
      stem: 'The observation above is best explained by which property of caffeine?',
      options: [
        'Its half-life of roughly five hours',
        'Its complete lack of absorption in the morning',
        'Its conversion to melatonin overnight',
        'Its irreversible binding to adenosine receptors'
      ],
      answer: 'A',
      marks: 2,
      explanation: 'With a half-life near five hours, an evening dose is still substantially present at bedtime, whereas a morning dose has largely cleared.'
    }
  ]
});
