// Render the scripted video to MP4 (1920×1080, H.264) for YouTube.
// Usage: node twilight/video/render.js <offline page .html> <out.mp4> [fps] [from-seconds] [to-seconds]
// Needs Playwright (Chromium) and ffmpeg with libx264.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const [page_, out, fpsArg, fromArg, toArg] = process.argv.slice(2);
const fps = +(fpsArg || 30);
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('PAGEERROR', e.message));
  await page.goto('file://' + path.resolve(page_));
  await page.waitForFunction(() => window.twilightAPI);
  await page.addStyleTag({ path: path.join(__dirname, 'video.css') });
  await page.addScriptTag({ path: path.join(__dirname, 'director.js') });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  const dur = await page.evaluate(() => window.__duration);
  const t0 = +(fromArg || 0), t1 = Math.min(dur, +(toArg || dur));
  const frames = Math.round((t1 - t0) * fps);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const started = Date.now();
  for (let i = 0; i < frames; i++) {
    await page.evaluate(t => window.__seek(t), t0 + i / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % (fps * 5) === 0) console.log(`${(t0 + i / fps).toFixed(1)}s / ${t1}s  (${((Date.now() - started) / 1000).toFixed(0)}s elapsed)`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('done:', out, frames, 'frames in', ((Date.now() - started) / 1000).toFixed(0), 's');
})();
