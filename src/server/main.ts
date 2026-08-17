import { lookupDepartment } from "#/handlers/lookupDepartment.js";
import { getFromConfig, openEventStream } from "#/libs/utils.js";
import express from "express";
import ViteExpress from "vite-express";
import { Semaphore } from "./libs/semaphore.js";

export type CourseDataEvent = { term: string; status: "started" | "finished" };
export type QueuedEvent = { isQueued: boolean };
export type ProgressCallback = (event: CourseDataEvent) => void;

const app = express();
const apiRouter = express.Router();

const lookupDepartmentSemaphore = new Semaphore(1);

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

  const { sendEvent, onProgress, fail, isClosed } = openEventStream(res, req);

  if (!departmentId) return fail(400, "Department ID is required");
  if (departmentId.length !== 4) return fail(400, "Department ID must be 4 characters long");
  if (!/^[a-zA-Z]+$/.test(departmentId))
    return fail(400, "Department ID can only be alphabetic characters");

  const departments = await getFromConfig("Departments");
  if (!departments.some((d: string) => d.startsWith(departmentId.toUpperCase())))
    return fail(404, "Department not found");

  const { ready, release } = lookupDepartmentSemaphore.acquire(
    () => sendEvent("queued", { isQueued: true }),
    () => sendEvent("queued", { isQueued: false }),
  );

  try {
    const courseData = await withRetry(
      () => lookupDepartment(departmentId.toUpperCase(), onProgress, ready),
      2,
    );

    if (isClosed()) return;

    sendEvent("done", courseData);
    res.end();
  } catch (err) {
    console.error("getCourseData failed after retries:", err);
    fail(500, "Internal server error while fetching course data");
  } finally {
    release();
  }
});

app.use("/api", apiRouter);
ViteExpress.listen(app, 3000, () => console.log("Server is listening on port 3000..."));
