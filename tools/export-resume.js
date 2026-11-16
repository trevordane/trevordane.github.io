// Renders resume.html to three PDFs (US Letter, one page each), all named
// Trevor-Dane-Respress-Resume.pdf so the name is right wherever a copy ends up:
//   pdf/full/          with Projects (Cerbi Demo, Writing)
//   pdf/no-projects/   no Projects section
//   pdf/print/         plain print / ATS copy: light colours, larger text, no Projects
// Usage, from the repo root:  node tools/export-resume.js
// Needs Playwright with Chromium (npm i -D playwright && npx playwright install chromium).

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const NAME = "Trevor-Dane-Respress-Resume.pdf";
// [query string, output folder]; FILE=resume-ashby.html etc. renders a tailored copy instead
const SOURCE = process.env.FILE || "resume.html";
const OUT = process.env.OUT || "";
const VARIANTS = [
  ["projects=all", "pdf/full"],
  ["projects=none", "pdf/no-projects"],
  ["projects=none&theme=light", "pdf/print"],
];

(async () => {
  const root = path.resolve(__dirname, "..");
  const browser = await chromium.launch();
  for (const [query, folder] of VARIANTS) {
    const dir = OUT ? path.join(OUT, path.basename(folder)) : folder;
    const file = path.join(dir, NAME);
    fs.mkdirSync(path.resolve(root, dir), { recursive: true });
    const page = await browser.newPage();
    await page.goto("file://" + path.join(root, SOURCE) + "?" + query);
    // resume.html draws the banner to a canvas once fonts load, then sets body[data-ready]
    await page.waitForSelector("body[data-ready]");

    // The layout is a fixed 8.5 x 11 in page; refuse to export if content spills past it.
    const overflow = await page.evaluate(() => document.body.scrollHeight > document.body.clientHeight + 1);
    if (overflow) {
      console.error(`${file}: resume.html overflows one page; trim content or reduce sizes.`);
      process.exitCode = 1;
    } else {
      await page.pdf({ path: path.resolve(root, file), format: "Letter", printBackground: true });
      console.log("Wrote " + file);
    }
    await page.close();
  }
  await browser.close();
})();
