// Renders resume.html to two PDFs (US Letter, one page each), all named
// Trevor-Dane-Respress-Resume.pdf so the name is right wherever a copy ends up:
//   pdf/full/          with Projects (Cerbi Demo, Writing)
//   pdf/no-projects/   no Projects section
// Usage, from the repo root:  node tools/export-resume.js
// Needs Playwright with Chromium (npm i -D playwright && npx playwright install chromium).

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const NAME = "Trevor-Dane-Respress-Resume.pdf";
const VARIANTS = [
  ["all", "pdf/full"],
  ["none", "pdf/no-projects"],
];

(async () => {
  const root = path.resolve(__dirname, "..");
  const browser = await chromium.launch();
  for (const [projects, dir] of VARIANTS) {
    const file = path.join(dir, NAME);
    fs.mkdirSync(path.join(root, dir), { recursive: true });
    const page = await browser.newPage();
    await page.goto("file://" + path.join(root, "resume.html") + "?projects=" + projects);
    // resume.html draws the banner to a canvas once fonts load, then sets body[data-ready]
    await page.waitForSelector("body[data-ready]");

    // The layout is a fixed 8.5 x 11 in page; refuse to export if content spills past it.
    const overflow = await page.evaluate(() => document.body.scrollHeight > document.body.clientHeight + 1);
    if (overflow) {
      console.error(`${file}: resume.html overflows one page; trim content or reduce sizes.`);
      process.exitCode = 1;
    } else {
      await page.pdf({ path: path.join(root, file), format: "Letter", printBackground: true });
      console.log("Wrote " + file);
    }
    await page.close();
  }
  await browser.close();
})();
