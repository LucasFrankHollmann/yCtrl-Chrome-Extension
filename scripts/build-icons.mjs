// Rasterizes branding/icon.svg into the PNG sizes the extension manifest needs.
// Uses headless Chrome as the renderer, so there is no image dependency to install.
// Override the browser with CHROME=/path/to/chrome npm run icons
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const SIZES = [16, 32, 48, 128]
const PROMO_SIZE = 512

const root = resolve(import.meta.dirname, '..')
const svg = join(root, 'branding', 'icon.svg')
const iconsDir = join(root, 'public', 'icons')

const candidates = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium'
].filter(Boolean)

const chrome = candidates.find((p) => existsSync(p))
if (!chrome) throw new Error(`Chrome not found. Set CHROME=/path/to/chrome. Tried:\n${candidates.join('\n')}`)

const work = mkdtempSync(join(tmpdir(), 'yctrl-icons-'))
mkdirSync(iconsDir, { recursive: true })

try {
  copyFileSync(svg, join(work, 'icon.svg'))

  for (const size of [...SIZES, PROMO_SIZE]) {
    const page = join(work, `page-${size}.html`)
    writeFileSync(
      page,
      `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:transparent}
img{display:block;width:${size}px;height:${size}px}</style>
<img src="icon.svg">`
    )

    const out = size === PROMO_SIZE ? join(root, 'branding', 'icon512.png') : join(iconsDir, `icon${size}.png`)

    execFileSync(
      chrome,
      [
        '--headless',
        '--disable-gpu',
        '--hide-scrollbars',
        '--force-device-scale-factor=1',
        '--default-background-color=00000000',
        '--virtual-time-budget=2000',
        `--window-size=${size},${size}`,
        `--screenshot=${out}`,
        pathToFileURL(page).href
      ],
      { stdio: 'ignore' }
    )

    console.log(`wrote ${out}`)
  }
} finally {
  rmSync(work, { recursive: true, force: true })
}
