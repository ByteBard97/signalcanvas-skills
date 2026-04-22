// Verifies every PatchLang example in references/examples.md compiles cleanly.
// Run: node verify-examples.mjs

import { readFileSync } from 'fs'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const wasm = require('/Users/ceres/Desktop/SignalCanvas/SignalCanvasLang/pkg-node/patchlang_wasm.js')

// --- Extract fenced code blocks from markdown ---
function extractExamples(md) {
  const blocks = []
  const re = /^```\n([\s\S]*?)^```/gm
  let m
  while ((m = re.exec(md)) !== null) {
    const src = m[1].trim()
    // Skip JSON and non-PatchLang blocks
    if (src.startsWith('{') || src.startsWith('use lib') || src.startsWith('template') ||
        src.startsWith('instance') || src.startsWith('connect') || src.startsWith('signal') ||
        src.startsWith('bridge') || src.startsWith('ring') || src.startsWith('#')) {
      blocks.push(src)
    }
  }
  return blocks
}

// --- Multi-file examples: extract named files ---
const MULTI_FILE_CAMPUS = `
use lib.yamaha { CL5, Rio3224 }

instance FOH_Console is CL5    { location: "Front of House" }
instance Stage_Left  is Rio3224 { location: "Stage Left" }

connect Stage_Left.Dante_Pri_Out -> FOH_Console.Dante_Pri_In {
  cable: "Cat6a_SL_Pri"
  length: "30m"
}
connect FOH_Console.Dante_Pri_Out -> Stage_Left.Dante_Pri_In {
  cable: "Cat6a_SL_Pri"
  length: "30m"
}
`.trim()

const MULTI_FILE_YAMAHA = `
template Rio3224 {
  meta {
    manufacturer: "Yamaha"
    model: "Rio3224"
    category: "Stagebox"
  }
  ports {
    Dante_Pri_In[1..32]:  in(etherCON) [Dante, primary]
    Dante_Pri_Out[1..32]: out(etherCON) [Dante, primary]
    Mic_In[1..32]:        in(XLR)
    Line_Out[1..16]:      out(XLR)
  }
  bridge Mic_In -> Dante_Pri_Out
}

template CL5 {
  meta {
    manufacturer: "Yamaha"
    model: "CL5"
    category: "Console"
  }
  ports {
    Dante_Pri_In[1..72]:  in(etherCON) [Dante, primary]
    Dante_Pri_Out[1..24]: out(etherCON) [Dante, primary]
  }
}
`.trim()

const md = readFileSync(
  new URL('./references/examples.md', import.meta.url),
  'utf8'
)

const singleFileExamples = extractExamples(md)

let passed = 0
let failed = 0

function check(label, source) {
  try {
    const raw = wasm.check(source)
    const result = JSON.parse(raw)
    const errors = result.errors ?? []
    const diagErrors = (result.diagnostics ?? []).filter(d => d.severity === 'error')
    const warnings = (result.diagnostics ?? []).filter(d => d.severity === 'warning')
    const infos = (result.diagnostics ?? []).filter(d => d.severity === 'info')

    if (errors.length > 0 || diagErrors.length > 0) {
      console.error(`\n❌ FAIL: ${label}`)
      for (const e of errors) console.error(`   Parse error: ${e.message}`)
      for (const d of diagErrors) console.error(`   DRC error:   ${d.message}`)
      failed++
    } else {
      const notes = []
      if (warnings.length > 0) notes.push(`${warnings.length} warning(s)`)
      if (infos.length > 0) notes.push(`${infos.length} info(s)`)
      console.log(`✓ PASS: ${label}${notes.length ? ' [' + notes.join(', ') + ']' : ''}`)
      if (warnings.length > 0) {
        for (const w of warnings) console.log(`   ⚠  ${w.message}`)
      }
      passed++
    }
  } catch (e) {
    console.error(`\n❌ FAIL: ${label}`)
    console.error(`   Exception: ${e.message}`)
    failed++
  }
}

function checkMulti(label, files, entry) {
  try {
    const raw = wasm.compile_project(JSON.stringify(files), entry)
    const result = JSON.parse(raw)
    const errors = result.errors ?? []
    const diagErrors = (result.diagnostics ?? []).filter(d => d.severity === 'error')
    const warnings = (result.diagnostics ?? []).filter(d => d.severity === 'warning')
    const infos = (result.diagnostics ?? []).filter(d => d.severity === 'info')

    if (errors.length > 0 || diagErrors.length > 0) {
      console.error(`\n❌ FAIL: ${label}`)
      for (const e of errors) console.error(`   Parse error: ${e.message}`)
      for (const d of diagErrors) console.error(`   DRC error:   ${d.message}`)
      failed++
    } else {
      const notes = []
      if (warnings.length > 0) notes.push(`${warnings.length} warning(s)`)
      if (infos.length > 0) notes.push(`${infos.length} info(s)`)
      console.log(`✓ PASS: ${label}${notes.length ? ' [' + notes.join(', ') + ']' : ''}`)
      if (warnings.length > 0) {
        for (const w of warnings) console.log(`   ⚠  ${w.message}`)
      }
      passed++
    }
  } catch (e) {
    console.error(`\n❌ FAIL: ${label}`)
    console.error(`   Exception: ${e.message}`)
    failed++
  }
}

console.log('PatchLang example verification\n')

// Named single-file examples
const EXAMPLE_NAMES = [
  'Ex 1: Single device template',
  'Ex 2: Dante console/stagebox pair',
  'Ex 3: Auto channel assignment',
  'Ex 4: Ring network (OptoCore)',
  'Ex 5: Slot/card installation',
  'Ex 6: Template composition',
  // Ex 7 is multi-file — handled separately below
  'Ex 8: DRC suppression',
]

for (let i = 0; i < singleFileExamples.length; i++) {
  check(EXAMPLE_NAMES[i] ?? `Block ${i + 1}`, singleFileExamples[i])
}

// Multi-file example (Ex 7) — compile as a project
checkMulti('Ex 7: Multi-file project', {
  'campus.patch': MULTI_FILE_CAMPUS,
  'lib/yamaha.patch': MULTI_FILE_YAMAHA,
}, 'campus.patch')

console.log(`\n${passed + failed} examples — ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
