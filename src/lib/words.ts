export interface CustomWord {
  en: string;
  ru: string;
}

const KEY = "zhanquiz-custom-words";

export function loadCustomWords(): CustomWord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as CustomWord[]) : [];
    return Array.isArray(list) ? list.filter((w) => w && w.en && w.ru) : [];
  } catch {
    return [];
  }
}

function persist(list: CustomWord[]): CustomWord[] {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
  return list;
}

export function addCustomWord(en: string, ru: string): CustomWord[] {
  const word = { en: en.trim().slice(0, 40), ru: ru.trim().slice(0, 40) };
  const list = loadCustomWords().filter((w) => w.en.toLowerCase() !== word.en.toLowerCase());
  return persist([...list, word].slice(-200));
}

export function removeCustomWord(en: string): CustomWord[] {
  return persist(loadCustomWords().filter((w) => w.en !== en));
}
