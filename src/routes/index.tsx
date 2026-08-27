import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  generateQuiz,
  loadRecords,
  saveRecord,
  type Difficulty,
  type Question,
  type Record as QuizRecord,
} from "@/lib/quiz";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ZhanQuiz — квиз по английскому и математике" },
      {
        name: "description",
        content:
          "Интерактивный квиз ZhanQuiz: слова английского языка и случайные примеры по математике, таймер, разбор ошибок и таблица рекордов.",
      },
      { property: "og:title", content: "ZhanQuiz — квиз по английскому и математике" },
      {
        property: "og:description",
        content: "Проверь себя: перевод слов, формы глаголов, проценты и уравнения. Разбор ошибок и рекорды.",
      },
    ],
  }),
  component: Index,
});

type Mode = "english" | "math" | "mixed";
type Screen = "start" | "quiz" | "result";

const MODES: { id: Mode; label: string; icon: string; desc: string; cls: string }[] = [
  {
    id: "english",
    label: "Английский",
    icon: "🅰",
    desc: "Перевод слов и формы глаголов",
    cls: "border-english/60 bg-english/10 hover:bg-english/20",
  },
  {
    id: "math",
    label: "Математика",
    icon: "∑",
    desc: "Случайные примеры и уравнения",
    cls: "border-math/60 bg-math/10 hover:bg-math/20",
  },
  {
    id: "mixed",
    label: "Смешанный",
    icon: "⚡",
    desc: "Всё вместе, вперемешку",
    cls: "border-accent/60 bg-accent/10 hover:bg-accent/20",
  },
];

const LEVELS: { id: Difficulty; label: string }[] = [
  { id: "easy", label: "Лёгкий" },
  { id: "medium", label: "Средний" },
  { id: "hard", label: "Сложный" },
];

const TIME_PER_QUESTION = 20;

function beep(ok: boolean) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = ok ? "sine" : "sawtooth";
    osc.frequency.value = ok ? 780 : 180;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.26);
    setTimeout(() => void ctx.close(), 400);
  } catch {
    /* звук недоступен */
  }
}

function Index() {
  const [screen, setScreen] = useState<Screen>("start");
  const [mode, setMode] = useState<Mode>("mixed");
  const [level, setLevel] = useState<Difficulty>("medium");
  const [count, setCount] = useState(10);
  const [name, setName] = useState("");
  const [timerOn, setTimerOn] = useState(true);
  const [soundOn, setSoundOn] = useState(true);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [left, setLeft] = useState(TIME_PER_QUESTION);
  const [records, setRecords] = useState<QuizRecord[]>([]);
  const savedRef = useRef(false);

  useEffect(() => setRecords(loadRecords()), []);

  const current = questions[index];

  const finish = useCallback(
    (all: (string | null)[]) => {
      const score = questions.reduce((s, q, i) => s + (all[i] === q.answer ? 1 : 0), 0);
      if (!savedRef.current) {
        savedRef.current = true;
        setRecords(
          saveRecord({
            name: name.trim() || "Гость",
            score,
            total: questions.length,
            mode,
            level,
            date: new Date().toLocaleDateString("ru-RU"),
          }),
        );
      }
      setScreen("result");
    },
    [questions, name, mode, level],
  );

  const next = useCallback(
    (value: string | null) => {
      const all = [...answers];
      all[index] = value;
      setAnswers(all);
      setSelected(null);
      setLocked(false);
      setLeft(TIME_PER_QUESTION);
      if (index + 1 >= questions.length) finish(all);
      else setIndex(index + 1);
    },
    [answers, index, questions.length, finish],
  );

  useEffect(() => {
    if (screen !== "quiz" || !timerOn || locked) return;
    if (left <= 0) {
      setLocked(true);
      if (soundOn) beep(false);
      const t = setTimeout(() => next(null), 900);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [screen, timerOn, locked, left, next, soundOn]);

  function start() {
    setQuestions(generateQuiz(mode, count, level));
    setAnswers(new Array(count).fill(null));
    setIndex(0);
    setSelected(null);
    setLocked(false);
    setLeft(TIME_PER_QUESTION);
    savedRef.current = false;
    setScreen("quiz");
  }

  function choose(option: string) {
    if (locked) return;
    setSelected(option);
    setLocked(true);
    if (soundOn) beep(option === current.answer);
  }

  const stats = useMemo(() => {
    const s = {
      total: questions.length,
      correct: 0,
      english: { total: 0, correct: 0 },
      math: { total: 0, correct: 0 },
    };
    questions.forEach((q, i) => {
      const ok = answers[i] === q.answer;
      if (ok) s.correct++;
      s[q.topic].total++;
      if (ok) s[q.topic].correct++;
    });
    return s;
  }, [questions, answers]);

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">quiz</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
            Zhan<span className="text-primary">Quiz</span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Английские слова и математика в одном тренажёре
          </p>
        </header>

        {screen === "start" && (
          <section className="animate-q-in space-y-6 rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-glow)] sm:p-8">
            <div className="grid gap-3 sm:grid-cols-3">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`rounded-2xl border p-4 text-left transition ${m.cls} ${
                    mode === m.id ? "ring-2 ring-primary" : "opacity-80"
                  }`}
                >
                  <span className="text-2xl">{m.icon}</span>
                  <p className="mt-2 font-semibold">{m.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{m.desc}</p>
                </button>
              ))}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">Количество вопросов</p>
              <div className="flex flex-wrap gap-2">
                {[5, 10, 20, 30].map((c) => (
                  <button
                    key={c}
                    onClick={() => setCount(c)}
                    className={`rounded-full border border-border px-4 py-2 text-sm transition hover:bg-secondary ${
                      count === c ? "bg-primary text-primary-foreground" : "bg-transparent"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">Сложность</p>
              <div className="flex flex-wrap gap-2">
                {LEVELS.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setLevel(l.id)}
                    className={`rounded-full border border-border px-4 py-2 text-sm transition hover:bg-secondary ${
                      level === l.id ? "bg-accent text-accent-foreground" : ""
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ваше имя (для рекордов)"
                className="rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              />
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={timerOn}
                    onChange={(e) => setTimerOn(e.target.checked)}
                    className="size-4 accent-[var(--primary)]"
                  />
                  Таймер
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={soundOn}
                    onChange={(e) => setSoundOn(e.target.checked)}
                    className="size-4 accent-[var(--primary)]"
                  />
                  Звук
                </label>
              </div>
            </div>

            <button
              onClick={start}
              className="min-h-11 w-full rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:opacity-90 active:scale-[0.99]"
            >
              Начать квиз
            </button>

            {records.length > 0 && (
              <div className="rounded-2xl border border-border bg-secondary/40 p-4">
                <p className="mb-3 text-sm font-semibold">🏆 Таблица лидеров</p>
                <ol className="space-y-1 text-sm text-muted-foreground">
                  {records.slice(0, 5).map((r, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span>
                        {i + 1}. {r.name}
                      </span>
                      <span className="text-foreground">
                        {r.score}/{r.total}{" "}
                        <span className="text-muted-foreground">· {r.date}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>
        )}

        {screen === "quiz" && current && (
          <section
            key={current.id}
            className="animate-q-in space-y-6 rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-glow)] sm:p-8"
          >
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Вопрос {index + 1} из {questions.length}
              </span>
              {timerOn && (
                <span className={left <= 5 ? "font-semibold text-destructive" : ""}>⏱ {left}s</span>
              )}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${(index / questions.length) * 100}%` }}
              />
            </div>

            <div>
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                  current.topic === "english"
                    ? "bg-english/20 text-english"
                    : "bg-math/20 text-math"
                }`}
              >
                {current.topic === "english" ? "🅰 Английский" : "∑ Математика"}
                {current.hint ? ` · ${current.hint}` : ""}
              </span>
              <h2 className="mt-4 text-2xl font-bold leading-snug sm:text-3xl">{current.prompt}</h2>
            </div>

            <div className="grid gap-3">
              {current.options.map((opt) => {
                const isAnswer = opt === current.answer;
                const isPicked = selected === opt;
                const state = !locked
                  ? "border-border bg-secondary/40 hover:bg-secondary"
                  : isAnswer
                    ? "border-success bg-success/15 animate-pop"
                    : isPicked
                      ? "border-destructive bg-destructive/15 animate-shake"
                      : "border-border bg-secondary/20 opacity-60";
                return (
                  <button
                    key={opt}
                    onClick={() => choose(opt)}
                    disabled={locked}
                    className={`min-h-11 rounded-xl border px-4 py-3 text-left text-base transition ${state}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => next(selected)}
              disabled={!locked}
              className="min-h-11 w-full rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
            >
              {index + 1 === questions.length ? "Завершить" : "Далее"}
            </button>
          </section>
        )}

        {screen === "result" && (
          <section className="animate-q-in space-y-6 rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-glow)] sm:p-8">
            <div
              className="rounded-2xl p-6 text-center"
              style={{ background: "var(--gradient-hero)" }}
            >
              <p className="text-sm text-muted-foreground">Ваш результат</p>
              <p className="mt-1 text-5xl font-black">
                {stats.correct}
                <span className="text-muted-foreground">/{stats.total}</span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {Math.round((stats.correct / Math.max(1, stats.total)) * 100)}% правильных ответов
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-english/40 bg-english/10 p-4">
                <p className="text-sm font-semibold text-english">🅰 Английский</p>
                <p className="mt-1 text-2xl font-bold">
                  {stats.english.correct}/{stats.english.total}
                </p>
              </div>
              <div className="rounded-2xl border border-math/40 bg-math/10 p-4">
                <p className="text-sm font-semibold text-math">∑ Математика</p>
                <p className="mt-1 text-2xl font-bold">
                  {stats.math.correct}/{stats.math.total}
                </p>
              </div>
            </div>

            {questions.some((q, i) => answers[i] !== q.answer) && (
              <div>
                <p className="mb-3 font-semibold">Разбор ошибок</p>
                <ul className="space-y-2">
                  {questions.map((q, i) =>
                    answers[i] === q.answer ? null : (
                      <li key={q.id} className="rounded-xl border border-border bg-secondary/40 p-4">
                        <p className="font-medium">{q.prompt}</p>
                        <p className="mt-1 text-sm text-destructive">
                          Ваш ответ: {answers[i] ?? "нет ответа"}
                        </p>
                        <p className="text-sm text-success">Правильно: {q.answer}</p>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={start}
                className="min-h-11 flex-1 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Пройти ещё раз
              </button>
              <button
                onClick={() => setScreen("start")}
                className="min-h-11 flex-1 rounded-xl border border-border px-6 py-3 font-semibold transition hover:bg-secondary"
              >
                К настройкам
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
