import express from "express";
import ViteExpress from "vite-express";
import { getCourseData } from "./xlsx.js";

const app = express();

app.get("/lookupDepartment/:id", async (req, res) => {
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

  const courseData = await getCourseData(departmentId.toUpperCase());
  if (!courseData || courseData.length === 0) {
    return res.status(404).send("No course data found for the given department ID");
  }

  res.send(courseData);
});

ViteExpress.listen(app, 3000, () => console.log("Server is listening on port 3000..."));
