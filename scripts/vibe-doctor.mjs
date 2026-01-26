import fs from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()

function fail(message) {
  console.error(`FAIL: ${message}`)
  process.exitCode = 1
}

function pass(message) {
  console.log(`PASS: ${message}`)
}

async function readText(relPath) {
  const absPath = path.join(root, relPath)
  try {
    return await fs.readFile(absPath, 'utf8')
  } catch {
    fail(`missing file: ${relPath}`)
    return null
  }
}

async function main() {
  const viteConfig = await readText('vite.config.ts')
  const indexHtml = await readText('index.html')

  if (!viteConfig || !indexHtml) return

  const hasBuildRelativeBase = /base\s*:\s*command\s*===\s*['"]build['"]\s*\?\s*['"]\.\/?['"]/m.test(
    viteConfig,
  )

  if (!hasBuildRelativeBase) {
    fail('vite.config.ts must set base to "./" when command === "build"')
  } else {
    pass('vite.config.ts base is relative (./) for build')
  }

  const rootAbsolutePublicAssetMatches = []

  const faviconRootAbsolute = /<link[^>]+rel=["']icon["'][^>]+href=["']\//i.test(indexHtml)
  if (faviconRootAbsolute) rootAbsolutePublicAssetMatches.push('favicon uses root-absolute href')

  if (rootAbsolutePublicAssetMatches.length > 0) {
    fail(`index.html contains root-absolute public asset reference(s): ${rootAbsolutePublicAssetMatches.join(', ')}`)
  } else {
    pass('index.html has no root-absolute public asset references (basic check)')
  }

  const hasBaseUrlFavicon = /href=["']%BASE_URL%vite\.svg["']/.test(indexHtml)
  if (!hasBaseUrlFavicon) {
    fail('index.html should use %BASE_URL%vite.svg for favicon')
  } else {
    pass('index.html favicon uses %BASE_URL%')
  }

  if (process.exitCode) {
    console.error('\nDoctor checks failed.')
  } else {
    console.log('\nDoctor checks passed.')
  }
}

main()
