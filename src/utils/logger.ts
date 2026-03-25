const isProd = import.meta.env.MODE === "production";

const logger = {
  log:   (...args: unknown[]) => { if (!isProd) console.log(...args);   },
  error: (...args: unknown[]) => { if (!isProd) console.error(...args); },
  warn:  (...args: unknown[]) => { if (!isProd) console.warn(...args);  },
};

export default logger;