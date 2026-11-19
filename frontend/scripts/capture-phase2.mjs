import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const url = process.env.PHASE2_URL ?? 'http://127.0.0.1:5173/';
const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const baseDir = process.cwd();
const screenshotDir = path.join(baseDir, 'docs', 'screenshots');
const measurementPath = path.join(baseDir, 'docs', 'phase-2-measurements.json');

const viewports = [
  { name: '1440', width: 1440, height: 900 },
  { name: '390', width: 390, height: 844 },
];

function rect(element) {
  if (!element) return null;
  const box = element.getBoundingClientRect();
  return {
    width: Number(box.width.toFixed(2)),
    height: Number(box.height.toFixed(2)),
    top: Number(box.top.toFixed(2)),
    left: Number(box.left.toFixed(2)),
  };
}

async function capture() {
  await mkdir(screenshotDir, { recursive: true });
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  const report = {
    generatedAt: new Date().toISOString(),
    url,
    viewports: [],
  };

  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
        reducedMotion: 'no-preference',
      });

      await context.addInitScript(() => {
        try {
          localStorage.setItem('bena.lang', 'en');
          localStorage.setItem(
            'bena.consent.v1',
            JSON.stringify({
              version: 1,
              decidedAt: new Date().toISOString(),
              categories: { essential: true, analytics: false, marketing: false },
            }),
          );
        } catch {
          // Storage may be unavailable; the page still renders.
        }
      });

      const page = await context.newPage();
      const issues = [];
      page.on('console', (message) => {
        if (message.type() === 'error') {
          const location = message.location();
          const source = location.url ? ` @ ${location.url}` : '';
          issues.push(`console: ${message.text()}${source}`);
        }
      });
      page.on('pageerror', (error) => issues.push(`pageerror: ${error.message}`));
      page.on('response', (response) => {
        if (response.status() >= 400) {
          issues.push(`http ${response.status()}: ${response.url()}`);
        }
      });

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await page.waitForSelector('h1', { timeout: 60_000 });
      await page.waitForSelector('section[aria-labelledby="home-featured"] article', {
        timeout: 60_000,
      });
      await page.evaluate(async () => {
        await document.fonts.ready;
      });

      const pause = page.getByRole('button', { name: /pause carousel/i });
      if (await pause.count()) await pause.click();

      const marketButton = page.getByRole('button', { name: /region and language selector/i });
      if (await marketButton.count()) {
        await marketButton.click();
        const dialog = page.getByRole('dialog');
        await dialog.waitFor();
        const marketDialog = await dialog.evaluate((element) => ({
          title: element.querySelector('h2')?.textContent?.trim() ?? null,
          countryOptions: element.querySelectorAll('select option').length,
          languages: Array.from(element.querySelectorAll('button[aria-pressed]')).map((button) =>
            button.textContent?.trim(),
          ),
        }));
        await dialog.getByRole('button', { name: /close/i }).last().click();
        await dialog.waitFor({ state: 'hidden' });
        report.marketDialog = marketDialog;
      }

      await page.waitForTimeout(800);

      const measurements = await page.evaluate(
        ({ toRectSource }) => {
          const toRect = new Function(`return (${toRectSource})`)();
          const hero = document.querySelector('section[aria-roledescription="carousel"]');
          const heading = document.querySelector('h1');
          const card = document.querySelector('section[aria-labelledby="home-featured"] article');
          const grid = card?.parentElement;
          const header = document.querySelector('header');
          const logo = document.querySelector('header img');
          const cardImage = card?.querySelector('.aspect-square');
          const marketButton = document.querySelector(
            'header button[aria-label*="Region and language"]',
          );
          const headingStyle = heading ? getComputedStyle(heading) : null;
          const gridStyle = grid ? getComputedStyle(grid) : null;

          return {
            hero: toRect(hero),
            h1: heading
              ? {
                  text: heading.textContent?.trim() ?? '',
                  fontSize: headingStyle?.fontSize ?? null,
                  lineHeight: headingStyle?.lineHeight ?? null,
                  fontFamily: headingStyle?.fontFamily ?? null,
                }
              : null,
            card: toRect(card),
            cardImage: toRect(cardImage),
            grid: grid
              ? {
                  columns: gridStyle?.gridTemplateColumns ?? null,
                  gap: gridStyle?.gap ?? null,
                  productCount: grid.querySelectorAll('article').length,
                }
              : null,
            navLinks: Array.from(document.querySelectorAll('nav a')).map((link) =>
              link.textContent?.trim(),
            ),
            marketControl: marketButton?.getAttribute('aria-label') ?? null,
            header: toRect(header),
            logo: logo
              ? {
                  rendered: toRect(logo),
                  naturalWidth: logo.naturalWidth,
                  naturalHeight: logo.naturalHeight,
                  complete: logo.complete,
                }
              : null,
            fonts: {
              interLoaded: document.fonts.check('16px "Inter Variable"'),
              manropeLoaded: document.fonts.check('16px "Manrope Variable"'),
            },
            cookieBannerVisible: Boolean(
              document.querySelector('section[aria-label="Cookies and privacy"]'),
            ),
            horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
            documentHeight: Math.round(document.documentElement.scrollHeight),
          };
        },
        { toRectSource: rect.toString() },
      );

      const screenshotPath = path.join(screenshotDir, `home-${viewport.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true, animations: 'disabled' });

      report.viewports.push({
        name: viewport.name,
        width: viewport.width,
        height: viewport.height,
        screenshot: path.relative(baseDir, screenshotPath).replaceAll('\\', '/'),
        measurements,
        issues,
      });

      await context.close();
    }
  } finally {
    await browser.close();
  }

  await writeFile(measurementPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
}

await capture();
