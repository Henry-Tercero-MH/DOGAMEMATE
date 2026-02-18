/**
 * Generador de problemas matemáticos nivel secundaria
 * Incluye: ecuaciones lineales, monomios, polinomios, productos notables, factorización
 */

// ─── Helpers ────────────────────────────────────────────────
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Formatea coeficiente para LaTeX
function coef(n, showOne = false) {
  if (n === 1 && !showOne) return '';
  if (n === -1 && !showOne) return '-';
  return String(n);
}

// Formatea un término: coeficiente * x^exp
function term(c, exp) {
  if (c === 0) return '';
  const sign = c > 0 ? '+' : '';
  if (exp === 0) return `${sign}${c}`;
  const variable = exp === 1 ? 'x' : `x^{${exp}}`;
  if (c === 1) return `${sign}${variable}`;
  if (c === -1) return `${sign}-${variable}`;
  return `${sign}${c}${variable}`;
}

// Formatea un polinomio como LaTeX: [{c, exp}, ...]
function polyToLatex(terms) {
  let latex = '';
  for (const t of terms) {
    latex += term(t.c, t.exp);
  }
  // Quitar + inicial
  if (latex.startsWith('+')) latex = latex.slice(1);
  return latex || '0';
}

// ─── Generadores por categoría ──────────────────────────────

// NIVEL 1: Operaciones básicas (calentamiento)
function basicArithmetic() {
  const a = randInt(1, 20);
  const b = randInt(1, 20);
  const ops = [
    { op: '+', result: a + b },
    { op: '-', result: a - b },
    { op: '\\times', result: a * b },
  ];
  const chosen = pick(ops);
  return {
    category: 'Aritmética',
    latex: `${a} ${chosen.op} ${b}`,
    answer: String(chosen.result),
    answerLatex: String(chosen.result),
    inputType: 'number',
    difficulty: 1,
  };
}

// NIVEL 2: Ecuaciones lineales simples: ax + b = c → resolver x
function linearEquation() {
  const x = randInt(-5, 8);
  const a = pick([2, 3, 4, 5, -2, -3]);
  const b = randInt(-10, 10);
  const c = a * x + b;
  return {
    category: 'Ecuación Lineal',
    latex: `${coef(a)}x ${b >= 0 ? '+' : ''} ${b} = ${c}`,
    prompt: 'Resuelve para x:',
    answer: String(x),
    answerLatex: `x = ${x}`,
    inputType: 'number',
    difficulty: 2,
  };
}

// NIVEL 3: Suma/Resta de monomios semejantes
function monomialAddSub() {
  const exp = randInt(1, 4);
  const c1 = randInt(2, 9);
  const c2 = randInt(2, 9);
  const isAdd = Math.random() > 0.5;
  const op = isAdd ? '+' : '-';
  const result = isAdd ? c1 + c2 : c1 - c2;
  const variable = exp === 1 ? 'x' : `x^{${exp}}`;

  return {
    category: 'Monomios',
    latex: `${c1}${variable} ${op} ${c2}${variable}`,
    answer: `${result}${variable}`,
    answerLatex: `${result === 0 ? '0' : `${coef(result, true)}${variable}`}`,
    inputType: 'choice',
    difficulty: 3,
    generateChoices() {
      const correct = `${coef(result, true)}${variable}`;
      const wrong1 = `${coef(c1 + c2 + randInt(1, 3), true)}${variable}`;
      const wrong2 = `${coef(result, true)}x^{${exp + 1}}`;
      const wrong3 = `${coef(c1 * c2, true)}${variable}`;
      return shuffle([
        { latex: correct, correct: true },
        { latex: wrong1, correct: false },
        { latex: wrong2, correct: false },
        { latex: wrong3, correct: false },
      ]);
    },
  };
}

// NIVEL 4: Multiplicación de monomios
function monomialMultiply() {
  const c1 = randInt(2, 6);
  const c2 = randInt(2, 6);
  const e1 = randInt(1, 3);
  const e2 = randInt(1, 3);
  const resultC = c1 * c2;
  const resultE = e1 + e2;
  const v1 = e1 === 1 ? 'x' : `x^{${e1}}`;
  const v2 = e2 === 1 ? 'x' : `x^{${e2}}`;
  const vr = resultE === 1 ? 'x' : `x^{${resultE}}`;

  return {
    category: 'Multiplicación de Monomios',
    latex: `(${c1}${v1})(${c2}${v2})`,
    answer: `${resultC}${vr}`,
    answerLatex: `${resultC}${vr}`,
    inputType: 'choice',
    difficulty: 4,
    generateChoices() {
      const correct = `${resultC}${vr}`;
      const wrong1 = `${c1 + c2}${vr}`;
      const wrong2 = `${resultC}x^{${e1 * e2}}`;
      const wrong3 = `${resultC + randInt(1, 5)}${vr}`;
      return shuffle([
        { latex: correct, correct: true },
        { latex: wrong1, correct: false },
        { latex: wrong2, correct: false },
        { latex: wrong3, correct: false },
      ]);
    },
  };
}

// NIVEL 5: División de monomios
function monomialDivide() {
  const c2 = randInt(2, 5);
  const resultC = randInt(2, 6);
  const c1 = c2 * resultC;
  const e2 = randInt(1, 3);
  const resultE = randInt(1, 3);
  const e1 = e2 + resultE;
  const v1 = e1 === 1 ? 'x' : `x^{${e1}}`;
  const v2 = e2 === 1 ? 'x' : `x^{${e2}}`;
  const vr = resultE === 1 ? 'x' : `x^{${resultE}}`;

  return {
    category: 'División de Monomios',
    latex: `\\frac{${c1}${v1}}{${c2}${v2}}`,
    answer: `${resultC}${vr}`,
    answerLatex: `${resultC}${vr}`,
    inputType: 'choice',
    difficulty: 5,
    generateChoices() {
      const correct = `${resultC}${vr}`;
      const wrong1 = `${c1 - c2}${vr}`;
      const wrong2 = `${resultC}x^{${e1 - e2 + 1}}`;
      const wrong3 = `${Math.floor(c1 / c2) + 1}${vr}`;
      return shuffle([
        { latex: correct, correct: true },
        { latex: wrong1, correct: false },
        { latex: wrong2, correct: false },
        { latex: wrong3, correct: false },
      ]);
    },
  };
}

// NIVEL 6: Suma de polinomios
function polynomialAdd() {
  const a1 = randInt(1, 5), b1 = randInt(-5, 5), c1 = randInt(-5, 5);
  const a2 = randInt(1, 5), b2 = randInt(-5, 5), c2 = randInt(-5, 5);
  const ra = a1 + a2, rb = b1 + b2, rc = c1 + c2;

  const p1 = polyToLatex([{ c: a1, exp: 2 }, { c: b1, exp: 1 }, { c: c1, exp: 0 }]);
  const p2 = polyToLatex([{ c: a2, exp: 2 }, { c: b2, exp: 1 }, { c: c2, exp: 0 }]);
  const result = polyToLatex([{ c: ra, exp: 2 }, { c: rb, exp: 1 }, { c: rc, exp: 0 }]);

  return {
    category: 'Suma de Polinomios',
    latex: `(${p1}) + (${p2})`,
    answer: result,
    answerLatex: result,
    inputType: 'choice',
    difficulty: 6,
    generateChoices() {
      const wrong1 = polyToLatex([{ c: ra + randInt(1, 3), exp: 2 }, { c: rb, exp: 1 }, { c: rc, exp: 0 }]);
      const wrong2 = polyToLatex([{ c: ra, exp: 2 }, { c: rb - randInt(1, 4), exp: 1 }, { c: rc, exp: 0 }]);
      const wrong3 = polyToLatex([{ c: a1 * a2, exp: 2 }, { c: b1 * b2, exp: 1 }, { c: c1 * c2, exp: 0 }]);
      return shuffle([
        { latex: result, correct: true },
        { latex: wrong1, correct: false },
        { latex: wrong2, correct: false },
        { latex: wrong3, correct: false },
      ]);
    },
  };
}

// NIVEL 7: Resta de polinomios
function polynomialSubtract() {
  const a1 = randInt(2, 7), b1 = randInt(-5, 5), c1 = randInt(-5, 5);
  const a2 = randInt(1, 4), b2 = randInt(-5, 5), c2 = randInt(-5, 5);
  const ra = a1 - a2, rb = b1 - b2, rc = c1 - c2;

  const p1 = polyToLatex([{ c: a1, exp: 2 }, { c: b1, exp: 1 }, { c: c1, exp: 0 }]);
  const p2 = polyToLatex([{ c: a2, exp: 2 }, { c: b2, exp: 1 }, { c: c2, exp: 0 }]);
  const result = polyToLatex([{ c: ra, exp: 2 }, { c: rb, exp: 1 }, { c: rc, exp: 0 }]);

  return {
    category: 'Resta de Polinomios',
    latex: `(${p1}) - (${p2})`,
    answer: result,
    answerLatex: result,
    inputType: 'choice',
    difficulty: 7,
    generateChoices() {
      const wrong1 = polyToLatex([{ c: a1 + a2, exp: 2 }, { c: b1 + b2, exp: 1 }, { c: c1 + c2, exp: 0 }]);
      const wrong2 = polyToLatex([{ c: ra, exp: 2 }, { c: rb + randInt(2, 5), exp: 1 }, { c: rc, exp: 0 }]);
      const wrong3 = polyToLatex([{ c: ra - 1, exp: 2 }, { c: rb, exp: 1 }, { c: rc + 2, exp: 0 }]);
      return shuffle([
        { latex: result, correct: true },
        { latex: wrong1, correct: false },
        { latex: wrong2, correct: false },
        { latex: wrong3, correct: false },
      ]);
    },
  };
}

// NIVEL 8: Multiplicación polinomio × monomio
function polyTimesMonomial() {
  const m = randInt(2, 4);
  const me = randInt(1, 2);
  const a = randInt(1, 5), b = randInt(-5, 5), c = randInt(-4, 4);
  const ra = m * a, rb = m * b, rc = m * c;
  const eA = 2 + me, eB = 1 + me, eC = me;

  const mono = `${m}${me === 1 ? 'x' : `x^{${me}}`}`;
  const poly = polyToLatex([{ c: a, exp: 2 }, { c: b, exp: 1 }, { c: c, exp: 0 }]);
  const result = polyToLatex([{ c: ra, exp: eA }, { c: rb, exp: eB }, { c: rc, exp: eC }]);

  return {
    category: 'Polinomio × Monomio',
    latex: `${mono}(${poly})`,
    answer: result,
    answerLatex: result,
    inputType: 'choice',
    difficulty: 8,
    generateChoices() {
      const wrong1 = polyToLatex([{ c: ra, exp: 2 }, { c: rb, exp: 1 }, { c: rc, exp: 0 }]);
      const wrong2 = polyToLatex([{ c: m + a, exp: eA }, { c: m + b, exp: eB }, { c: m + c, exp: eC }]);
      const wrong3 = polyToLatex([{ c: ra + 2, exp: eA }, { c: rb, exp: eB }, { c: rc - 1, exp: eC }]);
      return shuffle([
        { latex: result, correct: true },
        { latex: wrong1, correct: false },
        { latex: wrong2, correct: false },
        { latex: wrong3, correct: false },
      ]);
    },
  };
}

// NIVEL 9: Productos notables (a+b)² = a² + 2ab + b²
function binomialSquare() {
  const a = randInt(1, 5);
  const b = randInt(1, 6);
  const sign = Math.random() > 0.5 ? '+' : '-';
  const a2 = a * a;
  const ab2 = sign === '+' ? 2 * a * b : -2 * a * b;
  const b2 = b * b;

  const aVar = a === 1 ? 'x' : `${a}x`;
  const result = polyToLatex([{ c: a2, exp: 2 }, { c: ab2, exp: 1 }, { c: b2, exp: 0 }]);

  return {
    category: 'Productos Notables',
    latex: `(${aVar} ${sign} ${b})^{2}`,
    answer: result,
    answerLatex: result,
    inputType: 'choice',
    difficulty: 9,
    generateChoices() {
      const wrong1 = polyToLatex([{ c: a2, exp: 2 }, { c: b2, exp: 0 }]);
      const wrong2 = polyToLatex([{ c: a2, exp: 2 }, { c: ab2 * 2, exp: 1 }, { c: b2, exp: 0 }]);
      const wrong3 = polyToLatex([{ c: a2, exp: 2 }, { c: sign === '+' ? -ab2 : -ab2, exp: 1 }, { c: -b2, exp: 0 }]);
      return shuffle([
        { latex: result, correct: true },
        { latex: wrong1, correct: false },
        { latex: wrong2, correct: false },
        { latex: wrong3, correct: false },
      ]);
    },
  };
}

// NIVEL 10: Diferencia de cuadrados  a² - b² = (a+b)(a-b)
function differenceOfSquares() {
  const a = randInt(1, 6);
  const b = randInt(1, 6);
  const a2 = a * a;
  const b2 = b * b;
  const aVar = a === 1 ? 'x' : `${a}x`;

  return {
    category: 'Factorización',
    latex: `${a2 === 1 ? '' : a2}x^{2} - ${b2}`,
    prompt: 'Factoriza:',
    answer: `(${aVar}+${b})(${aVar}-${b})`,
    answerLatex: `(${aVar}+${b})(${aVar}-${b})`,
    inputType: 'choice',
    difficulty: 10,
    generateChoices() {
      const correct = `(${aVar}+${b})(${aVar}-${b})`;
      const wrong1 = `(${aVar}+${b})^{2}`;
      const wrong2 = `(${aVar}-${b})^{2}`;
      const wrong3 = `(${aVar}+${b * 2})(${aVar}-${b * 2})`;
      return shuffle([
        { latex: correct, correct: true },
        { latex: wrong1, correct: false },
        { latex: wrong2, correct: false },
        { latex: wrong3, correct: false },
      ]);
    },
  };
}

// ─── Generador principal ────────────────────────────────────

const generators = [
  basicArithmetic,      // 1
  linearEquation,       // 2
  monomialAddSub,       // 3
  monomialMultiply,     // 4
  monomialDivide,       // 5
  polynomialAdd,        // 6
  polynomialSubtract,   // 7
  polyTimesMonomial,    // 8
  binomialSquare,       // 9
  differenceOfSquares,  // 10
];

export const DIFFICULTY_LABELS = [
  'Aritmética Básica',
  'Ecuaciones Lineales',
  'Suma/Resta de Monomios',
  'Multiplicación de Monomios',
  'División de Monomios',
  'Suma de Polinomios',
  'Resta de Polinomios',
  'Polinomio × Monomio',
  'Productos Notables',
  'Factorización',
];

export function generateProblem(difficulty = null) {
  if (difficulty !== null && difficulty >= 1 && difficulty <= generators.length) {
    const problem = generators[difficulty - 1]();
    if (problem.generateChoices && problem.inputType === 'choice') {
      problem.choices = problem.generateChoices();
      delete problem.generateChoices;
    }
    return problem;
  }
  // Random difficulty
  const idx = Math.floor(Math.random() * generators.length);
  const problem = generators[idx]();
  if (problem.generateChoices && problem.inputType === 'choice') {
    problem.choices = problem.generateChoices();
    delete problem.generateChoices;
  }
  return problem;
}

export function getMaxDifficulty() {
  return generators.length;
}
