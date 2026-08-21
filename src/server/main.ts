import { lookupDepartment } from "#/handlers/lookupDepartment.js";
import { Semaphore } from "#/libs/semaphore.js";
import { downloadCourseList } from "#/libs/sis.js";
import { getFromConfig, HttpError, openEventStream } from "#/libs/utils.js";
import { findConflictingCourses, parseTimeRange } from "#/libs/xlsx.js";
import express from "express";
import ViteExpress from "vite-express";
import { getConflictsBetweenCourses } from "./handlers/conflictsBetweenCourses.js";

export type QueuedEvent = { isQueued: boolean };
export type CourseDataEvent = { term: string; status: "started" | "finished" };
export type CourseProgressCallback = (event: CourseDataEvent) => void;
export type DepartmentDataEvent = { department: string; status: "started" | "finished" };
export type DepartmentProgressCallback = (event: DepartmentDataEvent) => void;

const app = express();
const apiRouter = express.Router();

const lookupDepartmentSemaphore = new Semaphore(1);
const conflictsSemaphore = new Semaphore(1);

async function withRetry<T>(fn: () => Promise<T>, retries: number = 1): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof HttpError) {
        throw err; // Don't retry on HttpError
      }
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

  const { sendEvent, onProgress, fail, isClosed } = openEventStream<CourseDataEvent>(res, req);

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
          return await findConflictingCourses(
            savePath,
            departmentId,
            catalogNumber,
            rawDays,
            timeRange,
          );
        }, 2),
      );
    } catch (error) {
      console.error("conflictsWithinDepartment failed after retries:", error);
      res.status(500).send("Internal server error");
    } finally {
      release();
    }
  },
);

apiRouter.get("/conflictsBetweenCourses/:semester/:courses", async (req, res) => {
  const { semester, courses } = req.params;
  console.log(`Recieved request for ${semester} conflicts between ${courses}`);

  const { sendEvent, onProgress, fail, isClosed } = openEventStream<DepartmentDataEvent>(res, req);

  if (!semester || !courses) return fail(400, "Missing required parameters");
  if (!["Fall", "Spring", "Summer"].includes(semester)) return fail(400, "Invalid semester");

  const splitCourses = [
    ...new Set(
      courses
        .split(",")
        .map((course) => course.replace(/\s/g, "").toUpperCase())
        .filter((c) => c.length > 0),
    ),
  ];

  if (splitCourses.length < 2) return fail(400, "Please enter at least two unique courses");
  if (splitCourses.length > 10) return fail(400, "Please enter at most ten courses");
  if (!splitCourses.every((course) => /^[A-Za-z]{4}\d{3}$/.test(course)))
    return fail(400, "Invalid course format");

  const departments = await getFromConfig("Departments");
  for (const course of splitCourses) {
    const departmentId = course.slice(0, 4);
    if (!departments.some((d: string) => d.startsWith(departmentId.toUpperCase())))
      return fail(404, `Department ${departmentId} not found`);
  }

  const { ready, release } = conflictsSemaphore.acquire(
    () => sendEvent("queued", { isQueued: true }),
    () => sendEvent("queued", { isQueued: false }),
  );

  try {
    const courseData = await withRetry(
      () => getConflictsBetweenCourses(semester, splitCourses, onProgress, ready),
      2,
    );

    if (isClosed()) return;

    if (!courseData)
      return fail(404, "One or more courses do not exist in the most recent semesters");

    sendEvent("done", courseData);
    res.end();
  } catch (err) {
    if (err instanceof HttpError) {
      fail(err.status, err.message);
    } else {
      console.error("conflictsBetweenCourses failed after retries:", err);
      fail(500, "Internal server error");
    }
  } finally {
    release();
  }
});

app.use("/courses/api", apiRouter);

const PORT = Number(process.env.PORT) || 3000;
ViteExpress.listen(app, PORT, () => console.log(`Server is listening on port ${PORT}...`));
