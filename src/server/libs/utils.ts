import { fetchActiveTermsAndDepartments } from "#/libs/sis.js";
import { CourseDataEvent } from "#/main.js";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.resolve(__dirname, "../config.json");

interface Config {
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

export function openEventStream(res: any, req: any) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders?.();

  let closed = false;
  req.on("close", () => {
    closed = true;
  });

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const onProgress = (event: CourseDataEvent) => {
    if (closed) return;
    sendEvent("progress", event);
  };

  const fail = (status: number, message: string) => {
    if (closed) return;
    sendEvent("failed", { status, message });
    res.end();
  };

  const isClosed = () => closed;

  return { sendEvent, onProgress, fail, isClosed };
}
