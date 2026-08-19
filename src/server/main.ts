import { lookupDepartment } from "#/handlers/lookupDepartment.js";
import { Semaphore } from "#/libs/semaphore.js";
import { downloadCourseList } from "#/libs/sis.js";
import { getFromConfig, openEventStream } from "#/libs/utils.js";
import { findConflictingCourses, parseTimeRange } from "#/libs/xlsx.js";
import express from "express";
import ViteExpress from "vite-express";

export type CourseDataEvent = { term: string; status: "started" | "finished" };
export type QueuedEvent = { isQueued: boolean };
export type ProgressCallback = (event: CourseDataEvent) => void;

const app = express();
const apiRouter = express.Router();

const lookupDepartmentSemaphore = new Semaphore(1);
const conflictsWithinDepartmentSemaphore = new Semaphore(1);

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
  const departmentId = req.params.id;
  console.log("Recieved request for department ID:", departmentId);

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

apiRouter.get(
  "/conflictsWithinDepartment/:term/:departmentId/:catalogNumber/:date",
  async (req, res) => {
    const { term, departmentId, catalogNumber, date } = req.params;
    console.log(`Recieved request for ${departmentId} ${catalogNumber} conflicts in ${term}`);

    if (!term || !departmentId || !catalogNumber || !date)
      return res.status(400).send("Missing required parameters");
    if (!/^(?:Fall|Spring|Summer) \d{4}$/.test(term))
      return res.status(400).send("Invalid term format");
    if (departmentId.length !== 4)
      return res.status(400).send("Department ID must be 4 characters long");
    if (!/^[a-zA-Z]+$/.test(departmentId))
      return res.status(400).send("Department ID can only be alphabetic characters");
    if (!/^\d+$/.test(catalogNumber)) return res.status(400).send("Invalid catalog number format");

    const rawDays = date.slice(0, date.indexOf(" "));
    const rawTime = date.slice(date.indexOf(" ") + 1);
    if (!rawDays || !rawTime) return res.status(400).send("Invalid date format");
    if (rawDays.startsWith("A"))
      return res.status(422).send("Asynchronous classes don't have conflicts!");
    if (!/^[MTWRFSU]+$/.test(rawDays)) return res.status(400).send("Invalid days format");

    let timeRange;
    try {
      timeRange = parseTimeRange(rawTime);
    } catch {
      return res.status(400).send("Invalid time format");
    }
    if (!timeRange) return res.status(400).send("Invalid time format");

    const departments = await getFromConfig("Departments");
    if (!departments.some((d: string) => d.startsWith(departmentId.toUpperCase())))
      return res.status(404).send("Department not found");

    const { ready, release } = lookupDepartmentSemaphore.acquire();

    try {
      res.send(
        await withRetry(async () => {
          const savePath = await downloadCourseList(term, departmentId, ready);
          return await findConflictingCourses(savePath, catalogNumber, rawDays, timeRange);
        }, 2),
      );
    } catch (error) {
      console.error("Error occurred while processing conflicts:", error);
      res.status(500).send("Internal server error");
    } finally {
      release();
    }
  },
);

app.use("/api", apiRouter);
ViteExpress.listen(app, 3000, () => console.log("Server is listening on port 3000..."));
