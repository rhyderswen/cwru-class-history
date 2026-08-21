import { daysOverlap, rangesOverlap } from "#/libs/utils.js";
import ExcelJS from "exceljs";
import { CourseComponent, parseComponent } from "~/vars.js";

export interface CourseInfo {
  catalogNumber: string;
  title: string;
}

export interface OfferingInfo {
  component: CourseComponent;
  courseNumber: number;
  sectionNumber: number;
  days: string;
  time: string;
  room: string;
  instructor: string;
  enrollmentCap: number;
  enrollmentTotal: number;
}

export type CourseProps = OfferingInfo & Omit<CourseInfo, "offerings"> & { term: string };

export type CourseRow = CourseInfo & OfferingInfo;

export interface CourseData {
  courseCode: string;
  title: string;
  offerings: Record<string, Record<string, Omit<OfferingInfo, "component">[]>>;
}

export interface SingleOfferingInfo {
  component: string;
  courseNumber: number;
  sectionNumber: number;
  days: string;
  time: string;
}

export type SingleCourseRow = CourseInfo & SingleOfferingInfo;

export interface SingleCourseData {
  courseCode: string;
  title: string;
  offerings: Record<string, Omit<SingleOfferingInfo, "component">[]>;
}

export async function parseCourseListXlsx(filePath: string): Promise<CourseRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];

  const headerRow = sheet.getRow(1).values as string[];
  const colIndex = (name: string) => headerRow.indexOf(name);

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
      sectionNumber: Number(row.getCell(colIndex("CLASS_SECTION")).value ?? -1),
      days: shrinkDaysString(
        String(row.getCell(colIndex("CLASS_MTG_DAYS")).value ?? "").trim(),
        room,
      ),
      time: formatTimeString(String(row.getCell(colIndex("CW_CLASS_MTG_TIMES")).value ?? "")),
      room: room,
      instructor: findInstructor(row, title, rows, colIndex),
      enrollmentCap: Number(enrollmentCap ?? -1),
      enrollmentTotal: Number(enrollmentTot ?? -1),
    });
  });

  return rows;
}

export async function parseSingleCourseXlsx(filePath: string, catalogNumber: string) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];

  const headerRow = sheet.getRow(1).values as string[];
  const colIndex = (name: string) => headerRow.indexOf(name);

  const rows: SingleCourseRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header

    const currentCatalogNumber = String(row.getCell(colIndex("CATALOG_NBR")).value ?? "");
    if (currentCatalogNumber !== catalogNumber) return;

    const courseNumber = Number(row.getCell(colIndex("CLASS_NBR")).value ?? -1);
    if (rows.some((r) => r.courseNumber == courseNumber)) return; // skip duplicates

    let component = String(row.getCell(colIndex("SSR_COMPONENT")).value ?? "");
    component = component.charAt(0).toUpperCase() + component.slice(1).toLowerCase();

    const room = String(row.getCell(colIndex("CW_MEETING_ROOM")).value ?? "");

    rows.push({
      catalogNumber: currentCatalogNumber,
      title: String(row.getCell(colIndex("CW_CLASS_TITLE")).value ?? ""),
      component: component,
      courseNumber: courseNumber,
      sectionNumber: Number(row.getCell(colIndex("CLASS_SECTION")).value ?? -1),
      days: shrinkDaysString(
        String(row.getCell(colIndex("CLASS_MTG_DAYS")).value ?? "").trim(),
        room,
      ),
      time: formatTimeString(String(row.getCell(colIndex("CW_CLASS_MTG_TIMES")).value ?? "")),
    });
  });

  return rows;
}

export interface ConflictingCourse {
  courseCode: string; // CSDS 101
  component: string;
  multipleComponents: boolean; // if the class has more than one component
}

export interface PartiallyConflictingCourse extends ConflictingCourse {
  numConflicts: string; // e.g. "1/2"
}

export async function findConflictingCourses(
  filePath: string,
  departmentId: string,
  catalogNumber: string,
  days: string,
  timeRange: {
    start: number;
    end: number;
  },
) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];

  const headerRow = sheet.getRow(1).values as string[];
  const colIndex = (name: string) => headerRow.indexOf(name);

  const fullConflicts: ConflictingCourse[] = [];
  let partialConflicts: PartiallyConflictingCourse[] = [];

  let currentCourse = "";
  let currentConflictingComponents: string[] = [];
  let currentNonconflictingComponents: string[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header

    const catalogNum = String(row.getCell(colIndex("CATALOG_NBR")).value ?? "");
    if (catalogNumber === catalogNum) return;

    const courseCode = `${departmentId} ${catalogNum}`;

    if (courseCode !== currentCourse) {
      const multipleComponents =
        new Set([...currentConflictingComponents, ...currentNonconflictingComponents]).size > 1;

      new Set(currentConflictingComponents).forEach((component) => {
        // set to remove duplicates
        if (currentNonconflictingComponents.includes(component)) {
          if (!fullConflicts.some((c) => c.courseCode === currentCourse)) {
            partialConflicts.push({
              courseCode: currentCourse,
              component,
              multipleComponents,
              numConflicts: `${currentConflictingComponents.length} of ${currentConflictingComponents.length + currentNonconflictingComponents.length}`,
            });
          }
        } else {
          fullConflicts.push({ courseCode: currentCourse, component, multipleComponents });
          if (partialConflicts.some((c) => c.courseCode === currentCourse)) {
            partialConflicts = partialConflicts.filter((c) => c.courseCode !== currentCourse);
          }
        }
      });

      currentConflictingComponents = [];
      currentNonconflictingComponents = [];
      currentCourse = courseCode;
    }

    const currentDays = shrinkDaysString(
      String(row.getCell(colIndex("CLASS_MTG_DAYS")).value ?? "").trim(),
    );

    let component = String(row.getCell(colIndex("SSR_COMPONENT")).value ?? "");
    component = component.charAt(0).toUpperCase() + component.slice(1).toLowerCase();

    // No overlap in days, so no conflict
    if (!daysOverlap(currentDays, days)) return currentNonconflictingComponents.push(component);

    const currentTime = parseTimeRange(
      String(row.getCell(colIndex("CW_CLASS_MTG_TIMES")).value ?? ""),
    );
    if (!currentTime) return;

    if (rangesOverlap(currentTime, timeRange)) {
      currentConflictingComponents.push(component);
    } else {
      currentNonconflictingComponents.push(component);
    }
  });

  return { fullConflicts, partialConflicts };
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

function formatTimeString(time: string) {
  if (time.trim() === "-") {
    // When there is a day but no time, it's just a dash
    return "";
  }

  const [startRaw, endRaw] = time.split("-").map((s) => s.trim());

  if (!startRaw || !endRaw) {
    return time;
  }

  if (startRaw.slice(-2) === endRaw.slice(-2)) {
    // if both AM/PM, drop the first one
    return `${startRaw.slice(0, -3)}-${endRaw}`;
  }

  return time;
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

  const prevRow = rows.at(-1);

  if (!instructor) {
    return prevRow?.instructor ?? "";
  }

  // retroactively fill in missing instructor names for previous rows with the same title
  if (prevRow?.title === title && !prevRow.instructor) {
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

export async function isEmptyXlsx(filePath: string): Promise<boolean> {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    return (workbook.worksheets[0]?.actualRowCount ?? 0) <= 1; // header row counts
  } catch {
    return false;
  }
}

// timeStr format is "12:35 PM-1:50 PM"
export function parseTimeRange(timeStr: string) {
  if (!timeStr) return null;
  if (timeStr === "-") return null; // When there is a day but no time, it's just a dash

  let [startRaw, endRaw] = timeStr.split("-");

  const endPeriod = endRaw.slice(-2);
  if (endPeriod !== "AM" && endPeriod !== "PM") {
    throw new Error("End period has no period!");
  }

  const startPeriod = startRaw.slice(-2);
  if (startPeriod !== "AM" && startPeriod !== "PM") {
    // if the first period was dropped for redundancy

    startRaw += ` ${endPeriod}`;
  }

  return {
    start: parseTime(startRaw).getTime(),
    end: parseTime(endRaw).getTime(),
  };
}

function parseTime(raw: string) {
  const [hourStr, endStr] = raw.split(":");
  const minuteStr = endStr.slice(0, -3);
  const period = endStr.slice(-2);

  let hour;
  if (hourStr === "12") {
    hour = period.toUpperCase() === "PM" ? 12 : 0;
  } else {
    hour = period.toUpperCase() === "PM" ? Number(hourStr) + 12 : Number(hourStr);
  }

  const date = new Date();
  date.setHours(hour, Number(minuteStr), 0, 0);
  return date;
}
