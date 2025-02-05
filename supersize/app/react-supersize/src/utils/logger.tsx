const isDev = process.env.NODE_ENV !== "production";

export function log(...args: unknown[]) {
  if (isDev) {
    console.log(...args);
  }
}

export function warn(...args: unknown[]) {
  if (isDev) {
    console.warn(...args);
  }
}

export function error(...args: unknown[]) {
  if (isDev) {
    console.error(...args);
  }
}
