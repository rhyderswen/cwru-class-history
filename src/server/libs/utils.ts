import { fetchActiveTermsAndDepartments } from "#/libs/sis.js";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.resolve(__dirname, "../config.json");

export interface Config {
  ActiveTerms: string[];
  Departments: string[];
  LastChecked: string;
}

export async function getFromConfig<K extends keyof Config>(variable: K): Promise<Config[K]> {
  if (!existsSync(CONFIG_FILE)) {
    throw new Error("No file found at config.json. Please create a file.");
  }

  const raw = await readFile(CONFIG_FILE, "utf-8");
  let config;
  try {
    config = JSON.parse(raw) as Config;
  } catch {
    config = { ActiveTerms: [], Departments: [], LastChecked: "" };
  }

  const today = new Date().toISOString().split("T")[0];

  if (config.LastChecked !== today) {
    const { activeTerms, departments } = await fetchActiveTermsAndDepartments();
    config.ActiveTerms = activeTerms;
    config.Departments = departments;
    config.LastChecked = today;
    await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
  }

  return config[variable];
}

export async function getPastNYearsTermNames(n: number) {
  const terms: string[] = [];

  const activeTerms = await getFromConfig("ActiveTerms");
  const latestTerm = activeTerms[activeTerms.length - 1];
  let [season, yearString] = latestTerm.split(" ");
  const latestYear = parseInt(yearString, 10);
  let year = latestYear;
  terms.push(latestTerm);

  while (year > latestYear - n) {
    switch (season) {
      case "Fall":
        season = "Summer";
        break;
      case "Summer":
        season = "Spring";
        break;
      case "Spring":
        season = "Fall";
        year--;
        break;
    }
    terms.push(`${season} ${year}`);
  }

  return terms;
}

export async function getMostRecentSeasonTerm(season: string, n = 1) {
  const terms = await getPastNYearsTermNames(n + 1);

  return terms.filter((term) => term.startsWith(season));
}

export function rangesOverlap(
  a: { start: number; end: number },
  b: { start: number; end: number },
): boolean {
  return a.start < b.end && b.start < a.end;
}

export function daysOverlap(a: string, b: string): boolean {
  return a.split("").some((day) => b.includes(day));
}

export function openEventStream<T>(res: ServerResponse, req: IncomingMessage) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders?.();

  let closed = false;

  const markClosed = () => {
    closed = true;
  };

  res.on("close", markClosed);
  res.on("error", (err) => {
    closed = true;
    console.error("SSE response error:", err);
  });

  const isClosed = () => closed || res.writableEnded || res.destroyed;

  const sendEvent = (event: string, data: unknown) => {
    if (isClosed()) {
      return false;
    }

    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    return true;
  };

  const onProgress = (event: T) => {
    sendEvent("progress", event);
  };

  const fail = (status: number, message: string) => {
    if (isClosed()) {
      return;
    }

    sendEvent("failed", { status, message });

    if (!res.writableEnded && !res.destroyed) {
      res.end();
    }
  };

  return {
    sendEvent,
    onProgress,
    fail,
    isClosed,
  };
}

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "HttpError";
  }
}
