import { Semaphore } from "#/libs/semaphore.js";
import { downloadCourseList } from "#/libs/sis.js";
import { getPastNYearsTermNames } from "#/libs/utils.js";
import { CourseData, parseCourseListXlsx } from "#/libs/xlsx.js";
import { CourseProgressCallback } from "#/main.js";

const downloadConcurrency = new Semaphore(3);

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

        // NEW: wait for a concurrency slot before doing any browser work
        const { ready, release } = downloadConcurrency.acquire();
        await ready;

        try {
          const savePath = await downloadCourseList(term, departmentId, semaphoreReady);
          if (savePath) {
            const courseList = await parseCourseListXlsx(savePath);
            onProgress?.({ term, status: "finished" });
            if (courseList.length > 0) {
              return { term, courseList };
            }
          }
        } catch (err) {
          console.error(`Failed to download/parse ${departmentId} ${term}:`, err);
        } finally {
          release();
        }
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
