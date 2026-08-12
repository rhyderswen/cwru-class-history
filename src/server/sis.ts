import { getFromConfig } from "#/utils.js";
import { createEmptyXlsx, isValidXlsx } from "#/xlsx.js";
import { readdirSync, unlinkSync } from "fs";
import path from "path";
import { chromium, Download } from "playwright";
import { fileURLToPath } from "url";

const START_URL =
  "https://sisguest.case.edu/psc/P92SCWR_1/EMPLOYEE/SA/c/SSR_STUDENT_FL.SSR_MD_SP_FL.GBL?Action=U&MD=Y&GMenu=SSR_STUDENT_FL&GComp=SSR_START_PAGE_FL&GPage=SSR_START_PAGE_FL&scname=CS_SSR_MANAGE_CLASSES_NAV&ICAJAXTrf=true";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.resolve(__dirname, "downloads");

export async function downloadCourseList(termLabel: string, subjectCode: string) {
  const cachedFile = await checkIfRecentlyCached(subjectCode, termLabel);
  if (cachedFile) {
    return cachedFile;
  }

  console.log(`Downloading the ${subjectCode} ${termLabel} course list from SIS...`);

  const today = new Date().toISOString().split("T")[0];
  const savePath = path.join(OUTPUT_DIR, `${subjectCode}_${termLabel}_${today}.xlsx`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  page.setDefaultTimeout(10_000);
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("[browser console]", msg.text());
  });

  await page.goto(START_URL, { waitUntil: "networkidle" });

  // Select term
  if (!(await getFromConfig("ActiveTerms")).includes(termLabel)) {
    // open the previous terms menu if the term is old
    const prevTermsMenu = page.locator('a[id^="DERIVED_SSR_FL_SSR_CSTRMPRV_GRP"]').first();
    await prevTermsMenu.waitFor({ state: "visible" });
    await prevTermsMenu.click();
  }

  const termOption = page.getByText(termLabel, { exact: true }).first();
  await termOption.waitFor({ state: "visible" });
  await termOption.click();
  await page.waitForLoadState("networkidle");

  // Filter by subject code
  const descriptionCell = page
    .locator('span[id^="CW_CLSRCH_WRK2_DESCR50"]')
    .filter({ hasText: new RegExp(`^${subjectCode}\\s*-`) })
    .first();

  try {
    await descriptionCell.waitFor({ state: "visible" });
  } catch (err) {
    // department code not found
    await browser.close();
    await createEmptyXlsx(savePath);
    console.log(`${subjectCode} is not listed in ${termLabel}.`);
    return "";
  }

  const row = page.locator("tr.ps_grid-row").filter({ has: descriptionCell });
  const checkbox = row.locator('input.psc_rowselect[type="checkbox"]');
  await checkbox.check();

  // Click search
  const searchButton = page.getByRole("button", { name: /^search$/i }).first();
  await searchButton.click();
  await page.waitForLoadState("networkidle");

  // Click Download Excel
  let download: Download | undefined;
  try {
    [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 30_000 }),
      page
        .getByText(/download to excel/i)
        .first()
        .click(),
    ]);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("locator.click: Timeout")) {
      await browser.close();
      await createEmptyXlsx(savePath);
      console.log(`${subjectCode} had no courses in ${termLabel}.`);
      return "";
    }

    throw err;
  }

  await download?.saveAs(savePath);
  await browser.close();

  console.log(`Finished downloading the ${subjectCode} ${termLabel} course list from SIS!`);
  return savePath;
}

async function checkIfRecentlyCached(subjectCode: string, termLabel: string) {
  const filePathPrefix = `${subjectCode}_${termLabel}_`;
  const files = readdirSync(OUTPUT_DIR);
  const file = files.find((file) => file.startsWith(filePathPrefix));
  if (!file) {
    return "";
  }

  const filePath = path.join(OUTPUT_DIR, file);

  if (!(await isValidXlsx(filePath))) {
    console.log(`Cached file for ${subjectCode} ${termLabel} is corrupted, re-downloading...`);
    unlinkSync(filePath);
    return "";
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const today = new Date(new Date().toISOString().split("T")[0]);
  const downloadedDay = new Date(file.split("_")[2].split(".")[0]);
  const diffInDays = (today.getTime() - downloadedDay.getTime()) / msPerDay;

  if ((await getFromConfig("ActiveTerms")).includes(termLabel)) {
    if (diffInDays >= 7) {
      unlinkSync(filePath);
      return "";
    }
  } else {
    if (diffInDays >= 365) {
      // older terms will probably never update but it doesn't hurt to check every year just in case...
      unlinkSync(filePath);
      return "";
    }
  }

  return filePath;
}

export async function fetchActiveTermsAndDepartments() {
  console.log("Fetching active terms from SIS...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  page.setDefaultTimeout(10_000);
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("[browser console]", msg.text());
  });

  await page.goto(START_URL, { waitUntil: "networkidle" });

  const activeTermObjects = await page.locator('a[id^="SSR_CSTRMCUR_VW_DESCR"]');
  const activeTerms = await activeTermObjects.allTextContents();
  console.log("Finished fetching active terms from SIS!");

  const departmentLocator = page.locator('span[id^="CW_CLSRCH_WRK2_DESCR50"]');

  await Promise.all([
    departmentLocator.first().waitFor({ state: "visible" }),
    activeTermObjects.last().click(),
  ]);

  const departments = await departmentLocator.allTextContents();
  console.log("Finished fetching departments from SIS!");

  return {
    activeTerms: activeTerms,
    departments: departments,
  };
}
