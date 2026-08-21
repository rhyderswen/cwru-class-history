import { downloadCourseList } from "#/libs/sis.js";
import { getPastNYearsTermNames } from "#/libs/utils.js";
import { CourseData, parseCourseListXlsx } from "#/libs/xlsx.js";
import { CourseProgressCallback } from "#/main.js";

export async function lookupDepartment(
  departmentId: string,
  onProgress?: CourseProgressCallback,
  semaphoreReady?: Promise<void>,
) {
  const terms = await getPastNYearsTermNames(4);

  const courseData = (
    await Promise.all(
      terms.map(async (term) => {
        onProgress?.({ term, status: "started" });
        const savePath = await downloadCourseList(term, departmentId, semaphoreReady);
        if (savePath) {
          const courseList = await parseCourseListXlsx(savePath);
          if (courseList.length > 0) {
            onProgress?.({ term, status: "finished" });
            return { term, courseList };
          }
        }
        onProgress?.({ term, status: "finished" });
      }),
    )
  ).filter((item) => item !== undefined);

  const courseMap = new Map<string, CourseData>();

  for (const { term, courseList } of courseData) {
    for (const { catalogNumber, title, component, ...offeringInfo } of courseList) {
      const courseCode = `${departmentId} ${catalogNumber}`;

      if (!courseMap.has(courseCode)) {
        courseMap.set(courseCode, { courseCode, title: title, offerings: {} });
      }

      const course = courseMap.get(courseCode)!;

      if (!course.offerings[component]) {
        course.offerings[component] = {};
      }

      if (!course.offerings[component][term]) {
        course.offerings[component][term] = [];
      }

      course.offerings[component][term].push(offeringInfo);
    }
  }

  return Array.from(courseMap.values()).sort((a, b) => a.courseCode.localeCompare(b.courseCode));
}
