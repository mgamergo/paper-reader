export type Theme = "light" | "dark";
export type Preference = Theme | null;

const storageKey = "margin.theme.v1";
const systemQuery = "(prefers-color-scheme: dark)";

function parsePreference(value: unknown): Preference {
  return value === "light" || value === "dark" ? value : null;
}

function resolveTheme(preference: Preference, systemDark: boolean): Theme {
  return preference ?? (systemDark ? "dark" : "light");
}

export const themeBootstrap = `(()=>{const parse=${parsePreference.toString()};const resolve=${resolveTheme.toString()};let preference=null;try{preference=parse(localStorage.getItem(${JSON.stringify(storageKey)}))}catch{}document.documentElement.dataset.theme=resolve(preference,matchMedia(${JSON.stringify(systemQuery)}).matches)})()`;

let preference: Preference = null;
let initialized = false;
let theme: Theme = "light";
const listeners = new Set<() => void>();

function readPreference(): Preference {
  try {
    return parsePreference(localStorage.getItem(storageKey));
  } catch {
    return preference;
  }
}

function applyTheme() {
  theme = resolveTheme(preference, window.matchMedia(systemQuery).matches);
  document.documentElement.dataset.theme = theme;
  listeners.forEach((listener) => listener());
}

export function subscribeTheme(listener: () => void) {
  if (!initialized) {
    preference = readPreference();
    initialized = true;
  }
  listeners.add(listener);
  const query = window.matchMedia(systemQuery);
  function syncStorage(event: StorageEvent) {
    if (event.key !== storageKey && event.key !== null) return;
    try {
      if (event.storageArea !== localStorage) return;
    } catch {
      return;
    }
    preference = readPreference();
    applyTheme();
  }
  query.addEventListener("change", applyTheme);
  window.addEventListener("storage", syncStorage);
  applyTheme();
  return () => {
    listeners.delete(listener);
    query.removeEventListener("change", applyTheme);
    window.removeEventListener("storage", syncStorage);
  };
}

export function getTheme(): Theme {
  return theme;
}

export function getServerTheme(): null {
  return null;
}

export function toggleTheme() {
  preference = theme === "dark" ? "light" : "dark";
  try {
    localStorage.setItem(storageKey, preference);
  } catch {}
  applyTheme();
}
