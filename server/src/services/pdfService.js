import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
import { buildReportHtml } from '../utils/reportTemplate.js';

function resolveBrowserExecutablePath() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ].filter(Boolean);

  const match = candidates.find((candidate) => fs.existsSync(candidate));

  if (!match) {
    throw new Error(
      'Không tìm thấy Chrome/Edge để xuất PDF. Đặt PUPPETEER_EXECUTABLE_PATH hoặc cài Chrome/Edge trên máy chạy server.'
    );
  }

  return match;
}

function resolveLaunchArgs() {
  if (process.env.PUPPETEER_LAUNCH_ARGS) {
    return process.env.PUPPETEER_LAUNCH_ARGS.split(/\s+/).filter(Boolean);
  }

  if (process.platform === 'linux') {
    return ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'];
  }

  return [];
}

export async function generateReportPdf(report) {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: resolveBrowserExecutablePath(),
    args: resolveLaunchArgs()
  });

  try {
    const page = await browser.newPage();
    await page.setContent(buildReportHtml(report), { waitUntil: 'load' });
    await page.emulateMediaType('screen');

    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '14mm',
        right: '12mm',
        bottom: '14mm',
        left: '12mm'
      }
    });
  } finally {
    await browser.close();
  }
}
