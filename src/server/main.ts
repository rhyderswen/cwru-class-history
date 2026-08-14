import { lookupDepartment } from "#/handlers/lookupDepartment.js";
import { getFromConfig, openEventStream } from "#/libs/utils.js";
import express from "express";
import ViteExpress from "vite-express";

export type CourseDataEvent = { term: string; status: "started" | "finished" };
export type ProgressCallback = (event: CourseDataEvent) => void;

const app = express();
const apiRouter = express.Router();

async function withRetry<T>(fn: () => Promise<T>, retries: number = 1): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      console.error(`Attempt ${attempt + 1} failed:`, err);
    }
  }
  throw lastError;
}

apiRouter.get("/getDepartments", async (req, res) => {
  console.log("Recieved request for departments list");
  res.send(await getFromConfig("Departments"));
});

apiRouter.get("/lookupDepartment/:id", async (req, res) => {
  console.log("Recieved request for department ID:", req.params.id);
  const departmentId = req.params.id;
  if (!departmentId) {
    return res.status(400).send("Department ID is required");
  }
  if (departmentId.length !== 4) {
    return res.status(400).send("Department ID must be 4 characters long");
  }
  if (!/^[a-zA-Z]+$/.test(departmentId)) {
    return res.status(400).send("Department ID can only be alphabetic characters");
  }

  const departments = await getFromConfig("Departments");
  if (!departments.some((d: string) => d.startsWith(departmentId.toUpperCase()))) {
    return res.status(404).send("Department not found");
  }

  const { sendEvent, onProgress } = openEventStream(res);

  let closed = false;
  req.on("close", () => {
    closed = true;
  });

  try {
    const courseData = await withRetry(
      () => lookupDepartment(departmentId.toUpperCase(), onProgress),
      2,
    );

    if (closed) return;

    sendEvent("done", courseData);
  } catch (err) {
    console.error("getCourseData failed after retries:", err);
    if (!closed)
      sendEvent("failed", { message: "Internal server error while fetching course data" });
  } finally {
    if (!closed) res.end();
  }
});

app.use("/api", apiRouter);
ViteExpress.listen(app, 3000, () => console.log("Server is listening on port 3000..."));
