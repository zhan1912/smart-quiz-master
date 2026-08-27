import { loadCustomWords } from "./words";

export type Topic = "english" | "math";
export type Difficulty = "easy" | "medium" | "hard";

export interface Question {
  id: string;
  topic: Topic;
  prompt: string;
  hint?: string;
  options: string[];
  answer: string;
}

const WORDS: { en: string; ru: string; level: Difficulty }[] = [
  { en: "apple", ru: "яблоко", level: "easy" },
  { en: "house", ru: "дом", level: "easy" },
  { en: "water", ru: "вода", level: "easy" },
  { en: "friend", ru: "друг", level: "easy" },
  { en: "school", ru: "школа", level: "easy" },
  { en: "book", ru: "книга", level: "easy" },
  { en: "city", ru: "город", level: "easy" },
  { en: "bread", ru: "хлеб", level: "easy" },
  { en: "answer", ru: "ответ", level: "medium" },
  { en: "knowledge", ru: "знание", level: "medium" },
  { en: "journey", ru: "путешествие", level: "medium" },
  { en: "weather", ru: "погода", level: "medium" },
  { en: "language", ru: "язык", level: "medium" },
  { en: "success", ru: "успех", level: "medium" },
  { en: "measure", ru: "измерять", level: "medium" },
  { en: "improve", ru: "улучшать", level: "medium" },
  { en: "achievement", ru: "достижение", level: "hard" },
  { en: "reliability", ru: "надёжность", level: "hard" },
  { en: "consequence", ru: "последствие", level: "hard" },
  { en: "ambiguous", ru: "двусмысленный", level: "hard" },
  { en: "persuade", ru: "убеждать", level: "hard" },
  { en: "curiosity", ru: "любопытство", level: "hard" },
  { en: "sustainable", ru: "устойчивый", level: "hard" },
  { en: "estimate", ru: "оценивать", level: "hard" },
];

const VERBS: { base: string; past: string; level: Difficulty }[] = [
  { base: "go", past: "went", level: "easy" },
  { base: "eat", past: "ate", level: "easy" },
  { base: "see", past: "saw", level: "easy" },
  { base: "write", past: "wrote", level: "medium" },
  { base: "bring", past: "brought", level: "medium" },
  { base: "choose", past: "chose", level: "hard" },
  { base: "forgive", past: "forgave", level: "hard" },
];

const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]): T => arr[rnd(0, arr.length - 1)] as T;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(0, i);
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

function levelsUpTo(level: Difficulty): Difficulty[] {
  if (level === "easy") return ["easy"];
  if (level === "medium") return ["easy", "medium"];
  return ["easy", "medium", "hard"];
}

let counter = 0;
const uid = () => `q${++counter}-${Date.now().toString(36)}`;

function englishQuestion(level: Difficulty): Question {
  const allowed = levelsUpTo(level);
  const custom = loadCustomWords().map((w) => ({ ...w, level: "easy" as Difficulty }));
  const all = [...WORDS, ...custom];
  const pool = all.filter((w) => allowed.includes(w.level) || custom.includes(w as never));
  const verbPool = VERBS.filter((v) => allowed.includes(v.level));

  if (verbPool.length && Math.random() < 0.25) {
    const verb = pick(verbPool);
    const distractors = shuffle(VERBS.filter((v) => v.base !== verb.base))
      .slice(0, 3)
      .map((v) => v.past);
    return {
      id: uid(),
      topic: "english",
      prompt: `Past Simple от глагола «${verb.base}»?`,
      hint: "Формы глагола",
      options: shuffle([verb.past, ...distractors]),
      answer: verb.past,
    };
  }

  const word = pick(pool);
  const ruToEn = Math.random() < 0.5;
  const others = shuffle(all.filter((w) => w.en !== word.en)).slice(0, 3);
  const answer = ruToEn ? word.en : word.ru;
  const options = shuffle([answer, ...others.map((w) => (ruToEn ? w.en : w.ru))]);
  return {
    id: uid(),
    topic: "english",
    prompt: ruToEn ? `Как будет «${word.ru}» по-английски?` : `Что означает «${word.en}»?`,
    hint: ruToEn ? "RU → EN" : "EN → RU",
    options,
    answer,
  };
}

function mathQuestion(level: Difficulty): Question {
  const kinds =
    level === "easy"
      ? ["add", "sub", "mul"]
      : level === "medium"
        ? ["add", "sub", "mul", "div", "percent"]
        : ["mul", "div", "percent", "equation", "power"];
  const kind = pick(kinds);
  let prompt = "";
  let value = 0;
  let hint = "Арифметика";

  switch (kind) {
    case "add": {
      const a = rnd(level === "easy" ? 2 : 20, level === "easy" ? 40 : 400);
      const b = rnd(2, level === "easy" ? 40 : 400);
      prompt = `${a} + ${b} = ?`;
      value = a + b;
      break;
    }
    case "sub": {
      const a = rnd(20, level === "easy" ? 60 : 500);
      const b = rnd(1, a);
      prompt = `${a} − ${b} = ?`;
      value = a - b;
      break;
    }
    case "mul": {
      const a = rnd(2, level === "hard" ? 25 : 12);
      const b = rnd(2, level === "hard" ? 25 : 12);
      prompt = `${a} × ${b} = ?`;
      value = a * b;
      break;
    }
    case "div": {
      const b = rnd(2, 12);
      value = rnd(2, level === "hard" ? 30 : 12);
      prompt = `${b * value} ÷ ${b} = ?`;
      break;
    }
    case "percent": {
      const p = pick([5, 10, 15, 20, 25, 40, 50]);
      const base = rnd(2, 40) * 10;
      prompt = `Сколько будет ${p}% от ${base}?`;
      value = (base * p) / 100;
      hint = "Проценты";
      break;
    }
    case "power": {
      const a = rnd(2, 15);
      prompt = `${a}² = ?`;
      value = a * a;
      hint = "Степени";
      break;
    }
    default: {
      const x = rnd(2, 20);
      const k = rnd(2, 9);
      const c = rnd(1, 30);
      prompt = `Решите уравнение: ${k}x + ${c} = ${k * x + c}`;
      value = x;
      hint = "Уравнения";
    }
  }

  const answer = String(value);
  const set = new Set<string>([answer]);
  while (set.size < 4) {
    const delta = rnd(1, Math.max(3, Math.round(Math.abs(value) * 0.2) + 3));
    const cand = value + (Math.random() < 0.5 ? -delta : delta);
    if (cand >= 0) set.add(String(cand));
  }

  return {
    id: uid(),
    topic: "math",
    prompt,
    hint,
    options: shuffle([...set]),
    answer,
  };
}

export function generateQuiz(
  mode: "english" | "math" | "mixed",
  count: number,
  level: Difficulty,
): Question[] {
  const questions: Question[] = [];
  for (let i = 0; i < count; i++) {
    const topic: Topic =
      mode === "mixed" ? (Math.random() < 0.5 ? "english" : "math") : (mode as Topic);
    questions.push(topic === "english" ? englishQuestion(level) : mathQuestion(level));
  }
  return questions;
}

export interface Record {
  name: string;
  score: number;
  total: number;
  mode: string;
  level: Difficulty;
  date: string;
}

const KEY = "zhanquiz-leaderboard";

export function loadRecords(): Record[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record[]) : [];
  } catch {
    return [];
  }
}

export function saveRecord(rec: Record): Record[] {
  const next = [...loadRecords(), rec]
    .sort((a, b) => b.score / b.total - a.score / a.total || b.score - a.score)
    .slice(0, 10);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}
