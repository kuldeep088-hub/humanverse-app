const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = path.join(__dirname, "captured_screens");
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function run() {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1920,1080"]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  // 1. Login Page
  console.log("Capturing Login Page...");
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(OUTPUT_DIR, "01_login_screen.png") });

  // Click demo user Priya
  console.log("Logging in as Priya...");
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const priyaBtn = buttons.find(b => b.textContent && b.textContent.includes("Priya"));
    if (priyaBtn) priyaBtn.click();
  });

  await new Promise(r => setTimeout(r, 3000));
  console.log("Current URL after login:", page.url());

  // 2. Feed Page - All Posts
  console.log("Capturing Feed Page (All)...");
  await page.goto("http://localhost:3000/app/feed", { waitUntil: "networkidle2" });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(OUTPUT_DIR, "02_feed_all.png") });

  // 3. Feed Page - Help & Mentorship Subfilter
  console.log("Capturing Feed Help Filter...");
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll("button"));
    const helpTab = tabs.find(b => b.textContent && b.textContent.includes("Help"));
    if (helpTab) helpTab.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUTPUT_DIR, "03_feed_help.png") });

  // 4. Composer
  console.log("Capturing Composer & Pseudonym Toggle...");
  await page.goto("http://localhost:3000/app/feed", { waitUntil: "networkidle2" });
  await new Promise(r => setTimeout(r, 1500));
  await page.evaluate(() => {
    const composer = document.querySelector("textarea");
    if (composer) {
      composer.focus();
      composer.value = "Navigating an unexpected career pivot after 6 years in product design. Looking for honest advice from designers who transitioned into AI & Strategy...";
      composer.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(OUTPUT_DIR, "04_composer_active.png") });

  // 5. Threads Hub
  console.log("Capturing Threads Hub...");
  await page.goto("http://localhost:3000/app/threads", { waitUntil: "networkidle2" });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUTPUT_DIR, "05_threads_hub.png") });

  // 6. Specific Thread Detail
  console.log("Capturing Thread Detail...");
  await page.goto("http://localhost:3000/app/threads/laidoff", { waitUntil: "networkidle2" });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUTPUT_DIR, "06_thread_detail.png") });

  // 7. Circles Page
  console.log("Capturing Circles Page...");
  await page.goto("http://localhost:3000/app/circles", { waitUntil: "networkidle2" });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUTPUT_DIR, "07_circles_hub.png") });

  // 8. Career Journal Page
  console.log("Capturing Career Journal...");
  await page.goto("http://localhost:3000/app/journal", { waitUntil: "networkidle2" });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUTPUT_DIR, "08_career_journal.png") });

  // 9. Messages Page
  console.log("Capturing Messages...");
  await page.goto("http://localhost:3000/app/messages", { waitUntil: "networkidle2" });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUTPUT_DIR, "09_messages.png") });

  // 10. Notifications Page
  console.log("Capturing Notifications...");
  await page.goto("http://localhost:3000/app/notifications", { waitUntil: "networkidle2" });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUTPUT_DIR, "10_notifications.png") });

  // 11. Profile Page
  console.log("Capturing Profile & Timeline...");
  await page.goto("http://localhost:3000/app/profile/demo-user-1", { waitUntil: "networkidle2" }).catch(async () => {
    await page.goto("http://localhost:3000/app/settings", { waitUntil: "networkidle2" });
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUTPUT_DIR, "11_profile_view.png") });

  console.log("All real product screenshots successfully captured!");
  await browser.close();
}

run().catch(err => {
  console.error("Error during capture:", err);
  process.exit(1);
});
