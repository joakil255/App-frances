// Cuestionario de una lectura: una pregunta a la vez, sin responder dos veces. Sin DOM.
export function createReadingQuiz(quiz) {
  const { questions } = quiz;
  let index = 0;
  let correct = 0;
  const answered = new Set();

  return {
    current() {
      const { question, options } = questions[index];
      return { index, question, options };
    },

    // Devuelve null si ya se respondió esta pregunta o la opción no existe
    answer(choice) {
      const q = questions[index];
      if (answered.has(index) || !Number.isInteger(choice) || choice < 0 || choice >= q.options.length) return null;
      answered.add(index);
      const isCorrect = choice === q.answer;
      if (isCorrect) correct += 1;
      return { correct: isCorrect, answer: q.answer, explanation: q.explanation, evidence: q.evidence };
    },

    // false si ya era la última pregunta (no se mueve)
    next() {
      if (index >= questions.length - 1) return false;
      index += 1;
      return true;
    },

    result() {
      return { correct, total: questions.length };
    },
  };
}
