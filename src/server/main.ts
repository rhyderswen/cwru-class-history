import express from "express";
import ViteExpress from "vite-express";
import { getCourseData } from "./xlsx.js";

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

  let courseData;
  try {
    courseData = await withRetry(() => getCourseData(departmentId.toUpperCase()), 1);
  } catch (err) {
    console.error("getCourseData failed after retry:", err);
    return res.status(500).send("Internal server error while fetching course data");
  }

  if (!courseData || courseData.length === 0) {
    return res.status(404).send("No course data found for the given department ID");
  }

  res.send(courseData);
});

app.use("/api", apiRouter);
ViteExpress.listen(app, 3000, () => console.log("Server is listening on port 3000..."));
