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

async function readTextOptional(relPath) {
  const absPath = path.join(root, relPath)
  try {
    return await fs.readFile(absPath, 'utf8')
  } catch {
    return null
  }
}

async function main() {
  const templateInvariants = await readText('TEMPLATE_INVARIANTS.md')
  const packageJsonText = await readText('package.json')
  const viteConfig = await readText('vite.config.ts')
  const indexHtml = await readText('index.html')
  const assistServer = await readText('src/devtools/server.js')
  const store = await readText('src/store/index.ts')

  if (!templateInvariants || !packageJsonText || !viteConfig || !indexHtml || !assistServer || !store) return

  const agentBrowserSkill = await readText('.agent/skills/agent-browser/SKILL.md')
  if (!agentBrowserSkill) return

  if (!agentBrowserSkill.trim()) {
    fail('.agent/skills/agent-browser/SKILL.md must be non-empty')
  } else {
    pass('.agent/skills/agent-browser/SKILL.md exists')
  }

  if (/\.\/browser-start\.js/.test(agentBrowserSkill)) {
    fail('.agent/skills/agent-browser/SKILL.md must not reference ./browser-start.js (file is not part of this template)')
  } else {
    pass('agent-browser skill does not reference missing browser-start.js')
  }

  const hasInstallSteps = /npm\s+install\s+-g\s+agent-browser/.test(agentBrowserSkill) && /agent-browser\s+install/.test(agentBrowserSkill)
  if (!hasInstallSteps) {
    fail('agent-browser skill must include install steps (npm install -g agent-browser; agent-browser install)')
  } else {
    pass('agent-browser skill includes install steps')
  }

  if (!templateInvariants.trim()) {
    fail('TEMPLATE_INVARIANTS.md must be non-empty')
  } else {
    pass('TEMPLATE_INVARIANTS.md exists')
  }

  try {
    const pkg = JSON.parse(packageJsonText)
    const checkScript = pkg?.scripts?.check
    const doctorScript = pkg?.scripts?.['vibe:doctor']

    if (!doctorScript) {
      fail('package.json must define scripts.vibe:doctor')
    } else {
      pass('package.json defines scripts.vibe:doctor')
    }

    if (typeof checkScript !== 'string') {
      fail('package.json must define scripts.check as a string')
    } else {
      const requiredParts = ['pnpm vibe:doctor', 'pnpm lint', 'pnpm test', 'pnpm build']
      const missing = requiredParts.filter((p) => !checkScript.includes(p))

      if (missing.length > 0) {
        fail(`pnpm check must include: ${missing.join(', ')}`)
      } else {
        pass('pnpm check includes doctor + lint + test + build')
      }
    }
  } catch {
    fail('package.json must be valid JSON')
  }

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

  const scriptRootAbsolute = /<script[^>]+type=["']module["'][^>]+src=["']\//i.test(indexHtml)
  if (scriptRootAbsolute) rootAbsolutePublicAssetMatches.push('entry script uses root-absolute src')

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

  const handlesExecuteResult = /msg\.type\s*===\s*['"]executeResult['"]/.test(assistServer)
  if (!handlesExecuteResult) {
    fail('assist server must handle executeResult (route command results back to requester)')
  } else {
    pass('assist server handles executeResult')
  }

  const assistClient = await readText('src/devtools/client.ts')
  if (!assistClient) return

  const hasOriginAwareWs = /window\.location\.hostname/.test(assistClient)
  if (!hasOriginAwareWs) {
    fail('assist client should default WS host to window.location.hostname (Codespaces/https/LAN safe)')
  } else {
    pass('assist client WS host defaults to window.location.hostname')
  }

  const hasWssSupport = /window\.location\.protocol\s*===\s*['"]https:['"]\s*\?\s*['"]wss['"]\s*:\s*['"]ws['"]/.test(
    assistClient,
  )
  if (!hasWssSupport) {
    fail('assist client should use wss when window.location.protocol is https:')
  } else {
    pass('assist client supports wss on https origins')
  }

  const appliesInitialTheme = /applyTheme\(initialState\.theme\)/.test(store)
  if (!appliesInitialTheme) {
    fail('store must apply initial theme on startup (e.g. applyTheme(initialState.theme))')
  } else {
    pass('store applies initial theme on startup')
  }

  const mainEntry = await readText('src/main.tsx')
  if (!mainEntry) return

  const hasHashRouter = /HashRouter/.test(mainEntry)
  if (!hasHashRouter) {
    fail('router must be HashRouter by default (GH Pages friendly)')
  } else {
    pass('router is HashRouter by default')
  }

  const deployWorkflow = await readTextOptional('.github/workflows/deploy.yml')
  if (deployWorkflow) {
    const usesPnpmCheck = /run:\s*pnpm\s+check\b/.test(deployWorkflow)
    if (!usesPnpmCheck) {
      fail('deploy workflow should run pnpm check')
    } else {
      pass('deploy workflow runs pnpm check')
    }
  }

  if (process.exitCode) {
    console.error('\nDoctor checks failed.')
  } else {
    console.log('\nDoctor checks passed.')
  }
}

main()
