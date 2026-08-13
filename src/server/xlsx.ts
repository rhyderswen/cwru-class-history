import { ProgressCallback } from "#/main.js";
import { downloadCourseList } from "#/sis.js";
import { getPastNYearsTermNames } from "#/utils.js";
import ExcelJS from "exceljs";
import { CourseComponent } from "~/vars.js";

export const COMPONENT_NAMES: Record<string, CourseComponent> = {
  CLN: CourseComponent.CLINICAL,
  COP: CourseComponent.COOP,
  DIS: CourseComponent.DISCUSSION,
  DSR: CourseComponent.DISSERTATION,
  FLD: CourseComponent.FIELD,
  IND: CourseComponent.INDEPENDENT,
  LAB: CourseComponent.LAB,
  LEC: CourseComponent.LECTURE,
  PER: CourseComponent.PERFORMANCE,
  PED: CourseComponent.PHYSICALEDUCATION,
  PRA: CourseComponent.PRACTICUM,
  RCT: CourseComponent.RECITAL,
  REC: CourseComponent.RECITATION,
  RSC: CourseComponent.RESEARCH,
  SEM: CourseComponent.SEMINAR,
  STU: CourseComponent.STUDIO,
  THE: CourseComponent.THESIS,
  WRK: CourseComponent.WORKSHOP,
  Unknown: CourseComponent.UNKNOWN,
};

function parseComponent(raw: string): CourseComponent {
  const code = raw.trim().toUpperCase();
  const match = COMPONENT_NAMES[code];
  return match ?? CourseComponent.UNKNOWN;
}

export interface CourseInfo {
  catalogNumber: string;
  title: string;
}

export interface OfferingInfo {
  component: CourseComponent;
  courseNumber: number;
  days: string;
  time: string;
  room: string;
  instructor: string;
  enrollmentCap: number;
  enrollmentTotal: number;
}

export type CourseRow = CourseInfo & OfferingInfo;

export interface CourseData {
  courseCode: string;
  title: string;
  offerings: Record<string, Record<string, Omit<OfferingInfo, "component">[]>>;
}

export async function getCourseData(departmentId: string, onProgress?: ProgressCallback) {
  const terms = await getPastNYearsTermNames(4);

  const courseData = (
    await Promise.all(
      terms.map(async (term) => {
        onProgress?.({ term, status: "started" });
        const savePath = await downloadCourseList(term, departmentId);
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

export async function parseCourseListXlsx(filePath: string): Promise<CourseRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];

  const headerRow = sheet.getRow(1).values as string[];
  const colIndex = (name: string) => headerRow.findIndex((h) => h === name);

  const rows: CourseRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header

    const courseNumber = Number(row.getCell(colIndex("CLASS_NBR")).value ?? -1);
    if (rows.some((r) => r.courseNumber == courseNumber)) return; // skip duplicates

    let enrollmentCap = row.getCell(colIndex("SSR_CMB_ENRLCAP_FL")).value;
    let enrollmentTot = row.getCell(colIndex("SSR_CMB_ENRLTOT_FL")).value;
    if (enrollmentCap == "0" && enrollmentTot == "0") {
      enrollmentCap = row.getCell(colIndex("ENRL_CAP")).value;
      enrollmentTot = row.getCell(colIndex("ENRL_TOT")).value;
    }

    const title = String(row.getCell(colIndex("CW_CLASS_TITLE")).value ?? "");
    const room = String(row.getCell(colIndex("CW_MEETING_ROOM")).value ?? "");

    rows.push({
      catalogNumber: String(row.getCell(colIndex("CATALOG_NBR")).value ?? ""),
      title: title,
      component: parseComponent(String(row.getCell(colIndex("SSR_COMPONENT")).value ?? "")),
      courseNumber: courseNumber,
      days: shrinkDaysString(
        String(row.getCell(colIndex("CLASS_MTG_DAYS")).value ?? "").trim(),
        room,
      ),
      time: String(row.getCell(colIndex("CW_CLASS_MTG_TIMES")).value ?? ""),
      room: room,
      instructor: findInstructor(row, title, rows, colIndex),
      enrollmentCap: Number(enrollmentCap ?? -1),
      enrollmentTotal: Number(enrollmentTot ?? -1),
    });
  });

  return rows;
}

function shrinkDaysString(days: string, room?: string) {
  if (days.length > 0) {
    const splitDays = days.trim().split(" ");
    return splitDays
      .map((day) => {
        switch (day) {
          case "Mon":
            return "M";
          case "Tue":
            return "T";
          case "Wed":
            return "W";
          case "Thu":
            return "R";
          case "Fri":
            return "F";
          case "Sat":
            return "S";
          case "Sun":
            return "U";
          default:
            return day;
        }
      })
      .join("");
  } else if (room === "Online - Asynchronous") {
    return "Asynchronous";
  }

  return "";
}

function findInstructor(
  row: ExcelJS.Row,
  title: string,
  rows: CourseRow[],
  colIndex: (name: string) => number,
) {
  const instructorSplit = String(row.getCell(colIndex("INSTR_NAME")).value ?? "")
    .split(",")
    .reverse();

  const instructor =
    instructorSplit[0] ? `${instructorSplit[0].charAt(0)}. ${instructorSplit[1]}` : "";

  const prevRow = rows[rows.length - 1];

  if (!instructor) {
    return prevRow?.instructor ?? "";
  }

  // retroactively fill in missing instructor names for previous rows with the same title
  if (prevRow && prevRow.title === title && !prevRow.instructor) {
    prevRow.instructor = instructor;
  }

  return instructor;
}

export async function createEmptyXlsx(filePath: string) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Coursees");

  sheet.addRow([
    "CATALOG_NBR",
    "CW_CLASS_TITLE",
    "SSR_COMPONENT",
    "CLASS_NBR",
    "CLASS_MTG_DAYS",
    "CW_CLASS_MTG_TIMES",
    "CW_MEETING_ROOM",
    "INSTR_NAME",
    "SSR_CMB_ENRLCAP_FL",
    "SSR_CMB_ENRLTOT_FL",
  ]);

  await workbook.xlsx.writeFile(filePath);
}

export async function isValidXlsx(filePath: string): Promise<boolean> {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    return workbook.worksheets.length > 0;
  } catch {
    return false;
  }
}
