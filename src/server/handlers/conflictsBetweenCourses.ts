import { Semaphore } from "#/libs/semaphore.js";
import { downloadCourseList } from "#/libs/sis.js";
import { daysOverlap, getMostRecentSeasonTerm, HttpError, rangesOverlap } from "#/libs/utils.js";
import {
  isEmptyXlsx,
  parseSingleCourseXlsx,
  parseTimeRange,
  SingleCourseData,
  SingleOfferingInfo,
} from "#/libs/xlsx.js";
import { DepartmentProgressCallback } from "#/main.js";

export type OfferingWithConflicts = Omit<SingleOfferingInfo, "component"> & { conflicts: string[] };
export type CourseDataWithConflicts = Omit<SingleCourseData, "offerings"> & {
  offerings: Record<string, OfferingWithConflicts[]>;
};

export type CourseConflictResult = Omit<SingleCourseData, "offerings"> & {
  conflicting: Record<string, OfferingWithConflicts[]>;
  nonconflicting: Record<string, OfferingWithConflicts[]>;
};

const downloadConcurrency = new Semaphore(3);

export async function getConflictsBetweenCourses(
  semester: string,
  courses: string[],
  onProgress?: DepartmentProgressCallback,
  semaphoreReady?: Promise<void>,
) {
  const terms = await getMostRecentSeasonTerm(semester, 2);
  const departments = new Set(courses.map((course) => course.slice(0, 4)));
  const departmentArr = [...departments];

  const filenames: Record<string, [string, string]> = Object.fromEntries(
    // {"CSDS": [file1, file2], "COGS": ...}
    await Promise.all(
      departmentArr.map(async (departmentId) => {
        onProgress?.({ department: departmentId, status: "started" });
        const [mostRecent, nextMostRecent] = await Promise.all([
          downloadWithLimit(terms[0], departmentId, semaphoreReady),
          downloadWithLimit(terms[1], departmentId, semaphoreReady),
        ]);
        onProgress?.({ department: departmentId, status: "finished" });
        return [departmentId, [mostRecent, nextMostRecent]];
      }),
    ),
  );

  // if data has not yet been posted for all departments in the recent year (but has in the past), go back to a previous year
  const recentSemesterMissing = await Promise.all(
    departmentArr.map(async (departmentId) => {
      const [recentIsEmpty, nextIsEmpty] = await Promise.all([
        isEmptyXlsx(filenames[departmentId][0]),
        isEmptyXlsx(filenames[departmentId][1]),
      ]);
      return recentIsEmpty && !nextIsEmpty;
    }),
  );

  let termIndex = 0;
  if (recentSemesterMissing.some((result) => result)) {
    termIndex = 1;
  }

  const courseMap = new Map<string, CourseDataWithConflicts>();
  const allOfferings: { entry: OfferingWithConflicts; courseCode: string; component: string }[] =
    [];

  for (const courseCode of courses) {
    const courseRows = await parseSingleCourseXlsx(
      filenames[courseCode.slice(0, 4)][termIndex],
      courseCode.slice(4),
    );

    if (courseRows.length === 0) {
      throw new HttpError(404, `Course ${courseCode} not found in ${terms[termIndex]}`);
    }

    for (const { catalogNumber, title, component, ...offeringInfo } of courseRows) {
      if (!courseMap.has(courseCode)) {
        const formattedCourseCode = `${courseCode.slice(0, 4)} ${catalogNumber}`;
        courseMap.set(courseCode, { courseCode: formattedCourseCode, title: title, offerings: {} });
      }

      const course = courseMap.get(courseCode)!;

      if (!course.offerings[component]) {
        course.offerings[component] = [];
      }

      const entry: OfferingWithConflicts = { ...offeringInfo, conflicts: [] };
      course.offerings[component].push(entry);
      allOfferings.push({ entry, courseCode: course.courseCode, component });
    }
  }

  computeConflicts(allOfferings, courseMap);

  return {
    term: terms[termIndex],
    courses: Array.from(courseMap.values()).map(splitByConflictStatus),
  };
}

async function downloadWithLimit(
  term: string,
  departmentId: string,
  semaphoreReady?: Promise<void>,
) {
  const { ready, release } = downloadConcurrency.acquire();
  await ready;
  try {
    return await downloadCourseList(term, departmentId, semaphoreReady);
  } finally {
    release();
  }
}

function splitByConflictStatus(course: CourseDataWithConflicts): CourseConflictResult {
  const conflictingOfferings: Record<string, OfferingWithConflicts[]> = {};
  const nonconflictingOfferings: Record<string, OfferingWithConflicts[]> = {};

  for (const [component, entries] of Object.entries(course.offerings)) {
    const conflicting = entries.filter((entry) => entry.conflicts.length > 0);
    const nonconflicting = entries.filter((entry) => entry.conflicts.length === 0);

    if (conflicting.length > 0) {
      conflictingOfferings[component] = conflicting;
    }
    if (nonconflicting.length > 0) {
      nonconflictingOfferings[component] = nonconflicting;
    }
  }

  return {
    courseCode: course.courseCode,
    title: course.title,
    conflicting: conflictingOfferings,
    nonconflicting: nonconflictingOfferings,
  };
}

function computeConflicts(
  offerings: { entry: OfferingWithConflicts; courseCode: string; component: string }[],
  courseMap: Map<string, CourseDataWithConflicts>,
) {
  const offeringsByFormattedCode = new Map(
    Array.from(courseMap.values()).map((course) => [course.courseCode, course.offerings]),
  );

  for (let i = 0; i < offerings.length; i++) {
    for (let j = i + 1; j < offerings.length; j++) {
      const a = offerings[i];
      const b = offerings[j];

      if (a.courseCode === b.courseCode) continue;

      if (!daysOverlap(a.entry.days, b.entry.days)) continue;

      const timeA = parseTimeRange(a.entry.time);
      const timeB = parseTimeRange(b.entry.time);
      if (!timeA || !timeB) continue;

      if (!rangesOverlap(timeA, timeB)) continue;

      a.entry.conflicts.push(formatConflictLabel(b, offeringsByFormattedCode));
      b.entry.conflicts.push(formatConflictLabel(a, offeringsByFormattedCode));
    }
  }
}

function formatConflictLabel(
  offering: { entry: OfferingWithConflicts; courseCode: string; component: string },
  offeringsByFormattedCode: Map<string, Record<string, OfferingWithConflicts[]>>,
): string {
  const { courseCode, component, entry } = offering;
  const courseOfferings = offeringsByFormattedCode.get(courseCode)!;
  const componentNames = Object.keys(courseOfferings);

  const totalOfferings = componentNames.reduce(
    (sum, name) => sum + courseOfferings[name].length,
    0,
  );

  if (totalOfferings === 1) {
    return courseCode;
  }

  if (courseOfferings[component].length === 1) {
    // only one offering for this component
    return `${courseCode} (${component})`;
  }

  return `${courseCode} (${component} ${entry.sectionNumber})`;
}
