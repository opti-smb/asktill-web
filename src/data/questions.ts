export interface PickerQuestion {
  id: string;
  text: string;
  answerJsx: boolean;
}

export const pickerQuestions: PickerQuestion[] = [
  {
    id: 'q1',
    text: '"Which marketing channel actually paid back?"',
    answerJsx: true,
  },
  {
    id: 'q2',
    text: '"What\'s my real margin after fees and refunds?"',
    answerJsx: false,
  },
  {
    id: 'q3',
    text: '"Are customers coming back, or am I burning through them?"',
    answerJsx: false,
  },
  {
    id: 'q4',
    text: '"Which vendor costs grew fastest this month?"',
    answerJsx: false,
  },
  {
    id: 'q5',
    text: '"Why is Tuesday afternoon revenue half of every other weekday?"',
    answerJsx: false,
  },
];
