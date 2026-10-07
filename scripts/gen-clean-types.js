import { writeFileSync, mkdirSync } from 'node:fs'
/**
 * 生成组件库的可读类型声明 (.d.ts)
 *
 * 两条管线，镜像 src 目录结构输出到 dist：
 *   1. .vue 文件 → vue-component-meta 提取结构化元数据，渲染可读类型
 *   2. .ts 文件 → TypeScript compiler API 直接编译生成声明（处理 .vue 具名导入）
 *
 * 用法：vite build 后运行
 *   node scripts/gen-clean-types.js
 *
 * 生成内容（结构镜像 src）：
 *   dist/modules/…/*.vue.d.ts       组件类型（vue-component-meta 渲染）
 *   dist/types(.d.ts | /)           公共类型（tsc 编译）
 *   dist/utils/、dist/services/…    工具/服务类型（tsc 编译）
 *   dist/index.d.ts                 入口类型（tsc 编译 + 移除 CSS import）
 */
import { readdir, readFile, writeFile, mkdir, rm, stat } from 'node:fs/promises'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import pkg from 'vue-component-meta'

const { createChecker } = pkg

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const srcDir = join(rootDir, 'src')
const distDir = join(rootDir, 'dist')
const componentsSrcDir = join(srcDir, 'modules')
const componentsDistDir = join(distDir, 'modules')

// 共享类型名 → 所在 types 目录（启动时从源码动态提取）
let sharedTypeMap = new Map()

const checker = createChecker(join(rootDir, 'tsconfig.build.json'), { schema: false })

// ─── 工具函数 ───

/** 去掉类型字符串末尾的 " | undefined"（可选 props 统一用 ? 标记） */
function stripUndefined(type) {
  return type.replace(/\s*\|\s*undefined$/, '').trim()
}

/** 去掉整体包裹的多余括号：((a) => void) -> (a) => void */
function cleanParens(type) {
  let s = type.trim()
  while (s.startsWith('(') && s.endsWith(')')) {
    let depth = 0
    let wraps = true
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '(') depth++
      else if (s[i] === ')') {
        depth--
        if (depth === 0 && i < s.length - 1) {
          wraps = false
          break
        }
      }
    }
    if (!wraps) break
    s = s.slice(1, -1).trim()
  }
  return s
}

/** 统一清洗类型文本：去 undefined、去多余括号、去尾部分号 */
function cleanType(type, required = false) {
  return cleanParens(required ? type : stripUndefined(type))
}

/** 4 空格缩进 → 2 空格（渲染模板与 tsc emit 默认均为 4 空格） */
function dedent4to2(text) {
  return text.replace(/^( {4})+/gm, (m) => ' '.repeat(m.length / 2))
}

/** 顶层声明之间插入空行（tsc emit 默认把声明挤在一起） */
function separateDeclarations(text) {
  return text.replace(/\n(?!\n)(?=export )/g, '\n\n')
}

/** 递归扫描 src/modules 下所有 types/ 目录，提取导出的类型名 → 来源文件映射（去扩展名） */
async function extractSharedTypeMap() {
  const typeRe = /^export type (\w+)/gm
  const interfaceRe = /^export interface (\w+)/gm
  const scanFile = async (file, typesDir) => {
    const src = await readFile(file, 'utf-8')
    const baseName = file.replace(/\.(?:ts|d\.ts)$/, '')
    for (const re of [typeRe, interfaceRe]) {
      let m
      re.lastIndex = 0
      while ((m = re.exec(src)) !== null) sharedTypeMap.set(m[1], baseName)
    }
  }
  const findTypesDirs = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'types') {
          for (const f of await readdir(full)) {
            if (f.endsWith('.ts') || f.endsWith('.d.ts')) await scanFile(join(full, f), full)
          }
        }
        await findTypesDirs(full)
      }
    }
  }
  await findTypesDirs(srcDir)
}

/** 收集类型文本中出现的共享类型名，按来源生成 import 语句 */
function collectSharedImports(texts, outPath) {
  const localNames = new Set(['Props', 'Slots', 'Exposed', 'Emits'])
  const names = [...sharedTypeMap.keys()].filter((n) => !localNames.has(n))
  if (names.length === 0) return []
  const used = new Set()
  const re = new RegExp(`\\b(${names.join('|')})\\b`, 'g')
  for (const text of texts) {
    let m
    while ((m = re.exec(text)) !== null) used.add(m[1])
  }
  if (used.size === 0) return []
  const importsByPath = new Map()
  for (const name of used) {
    const srcBase = sharedTypeMap.get(name)
    if (!srcBase) continue
    const distFile = join(distDir, relative(srcDir, srcBase) + '.d.ts')
    let rel = relative(dirname(outPath), distFile).replace(/\\\\/g, '/')
    if (!rel.startsWith('.') && !rel.startsWith('/')) rel = './' + rel
    if (!importsByPath.has(rel)) importsByPath.set(rel, [])
    importsByPath.get(rel).push(name)
  }
  return [...importsByPath.entries()].map(
    ([path, names]) => `import type { ${names.join(', ')} } from '${path}'`,
  )
}

/** 从 <script setup> 提取顶层 type/interface 声明（含 JSDoc，保留 export 关键字）。
 *  跳过 Props 接口 —— 生成器会基于 meta 重新渲染它。 */
function extractExportTypes(vueSource) {
  const m = vueSource.match(/<script setup[^>]*>([\s\S]*?)<\/script>/)
  if (!m) return []
  const sf = ts.createSourceFile(
    'comp.vue.ts',
    m[1],
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const types = []
  for (const stmt of sf.statements) {
    if (ts.isTypeAliasDeclaration(stmt) || ts.isInterfaceDeclaration(stmt)) {
      if (ts.isInterfaceDeclaration(stmt) && stmt.name.text === 'Props') continue
      types.push(stmt.getFullText(sf).trim())
    }
  }
  return types
}

/** 从 <script setup> 提取 export type { ... } re-export 声明 */
function extractTypeReExports(vueSource) {
  const m = vueSource.match(/<script setup[^>]*>([\s\S]*?)<\/script>/)
  if (!m) return []
  const re = /export\s+type\s*\{([^}]+)\}/g
  const results = []
  let match
  while ((match = re.exec(m[1])) !== null) {
    results.push(`export type {${match[1]}}`)
  }
  return results
}

// ─── 渲染函数 ───

/** 渲染 Props 接口（过滤 Vue 全局 props，带 JSDoc） */
function renderProps(meta) {
  const props = meta.props.filter((p) => !p.global)
  if (props.length === 0) return null

  const lines = []
  for (const p of props) {
    if (p.description) lines.push(`    /** ${p.description.replace(/\n/g, '\n     * ')} */`)
    const type = cleanType(p.type, p.required)
    lines.push(`    ${p.name}${p.required ? '' : '?'}: ${type}`)
  }
  return `interface Props {\n${lines.join('\n')}\n}`
}

/** 渲染 Slots 类型 */
function renderSlots(meta) {
  if (meta.slots.length === 0) return null
  const lines = meta.slots.map((slot) => {
    const type = cleanType(slot.type).replace(/;\s*\}$/, '}')
    const params = type === '{}' || type === '' ? '()' : `(props: ${type})`
    return `    ${slot.name}?: ${params} => any`
  })
  return `type Slots = {\n${lines.join('\n')}\n}`
}

/** 渲染 Exposed 类型 */
function renderExposed(meta) {
  if (meta.exposed.length === 0) return null
  const lines = meta.exposed.map((e) => {
    const head = e.description ? `    /** ${e.description.replace(/\n/g, '\n     * ')} */\n` : ''
    return `${head}    ${e.name}: ${cleanType(e.type)}`
  })
  return `type Exposed = {\n${lines.join('\n')}\n}`
}

/** 渲染 Emits 类型（v-model 的 update:xxx 事件） */
function renderEmits(meta) {
  const events = meta.events.filter((e) => e.name.startsWith('update:'))
  if (events.length === 0) return null
  const lines = events.map((e) => {
    // e.type 形如 "[value: string | number]" 或 "[]"
    const params = e.type
      .trim()
      .replace(/^\[|\]$/g, '')
      .trim()
    const sig = params ? `(${params})` : '()'
    return `    '${e.name}': ${sig} => any`
  })
  return `type Emits = {\n${lines.join('\n')}\n}`
}

/** 渲染组件声明，组装 Props / Emits / Exposed / Slots */
function renderComponent(propsBlock, slotsBlock, exposedBlock, emitsBlock) {
  const propsType = propsBlock ? 'Props' : '{}'
  const emitArg = emitsBlock ? 'Emits' : '{}'

  const members = []
  if (exposedBlock) members.push('Exposed')
  if (slotsBlock) members.push('{ $slots: Slots }')

  let decl
  if (members.length === 0) {
    decl = emitsBlock
      ? `DefineComponent<${propsType}, {}, {}, {}, {}, {}, {}, Emits>`
      : `DefineComponent<${propsType}>`
  } else {
    const inst = members.join(' & ')
    decl = `DefineComponent<${propsType}, {}, {}, {}, {}, {}, {}, ${emitArg}> & {\n    new (): ${inst}\n}`
  }
  return `declare const _default: ${decl}`
}

/** 组装一个 .vue.d.ts 文件内容 */
function renderVueDts(vueSource, meta, outPath) {
  const exportTypes = extractExportTypes(vueSource)
  const typeReExports = extractTypeReExports(vueSource)
  const propsBlock = renderProps(meta)
  const slotsBlock = renderSlots(meta)
  const exposedBlock = renderExposed(meta)
  const emitsBlock = renderEmits(meta)

  // 收集所有类型文本，推导 types 的 import
  const typeTexts = [
    ...exportTypes,
    ...typeReExports,
    propsBlock ?? '',
    slotsBlock ?? '',
    exposedBlock ?? '',
    emitsBlock ?? '',
  ]
  const imports = collectSharedImports(typeTexts, outPath)

  const result = []
  if (imports.length > 0) result.push(imports.join('\n'))
  result.push(`import type { DefineComponent } from 'vue'`)
  result.push('')
  if (exportTypes.length > 0) {
    result.push(exportTypes.join('\n'))
    result.push('')
  }
  if (propsBlock) {
    result.push(propsBlock)
    result.push('')
  }
  if (slotsBlock) {
    result.push(slotsBlock)
    result.push('')
  }
  if (exposedBlock) {
    result.push(exposedBlock)
    result.push('')
  }
  if (emitsBlock) {
    result.push(emitsBlock)
    result.push('')
  }
  result.push(renderComponent(propsBlock, slotsBlock, exposedBlock, emitsBlock))
  result.push('export default _default')
  if (typeReExports.length > 0) {
    result.push('')
    result.push(typeReExports.join('\n'))
  }
  result.push('')

  return result.join('\n')
}

// ─── 扫描与生成 ───

async function scanVueFiles(dir) {
  const files = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await scanVueFiles(full)))
    else if (entry.name.endsWith('.vue')) files.push(full)
  }
  return files
}

/** 扫描 src 下所有 .ts 文件（排除 env.d.ts） */
async function scanTsFiles(dir) {
  const files = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await scanTsFiles(full)))
    else if (entry.name.endsWith('.ts') && entry.name !== 'env.d.ts') files.push(full)
  }
  return files
}

/**
 * 用 TypeScript compiler API 编译 src 下所有 .ts 文件，生成声明到 dist（结构镜像）。
 *   - 动态 shim：源码中 import .vue 的具名类型（FormItem、MenuInstance…）在编译期占位为 any，
 *     dist 中真实的 .vue.d.ts 才是最终类型（消费者解析时兜底）。
 *   - emit 时把 '@/' 别名重写为相对路径，并过滤 index.d.ts 的 CSS import。
 */
async function compileTsDeclarations() {
  const configFile = ts.readConfigFile(join(rootDir, 'tsconfig.build.json'), ts.sys.readFile)
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, rootDir)

  const tsFiles = await scanTsFiles(srcDir)

  // 1. 收集所有从 .vue 具名导入/重导出的类型名
  const vueNamedImports = new Set()
  const vueModuleRe =
    /(?:import|export)\s*(?:[\w$]+\s*,\s*)?\{([^}]+)\}\s*from\s*['"][^'"]+\.vue['"]/g
  for (const file of tsFiles) {
    const src = await readFile(file, 'utf-8')
    let m
    while ((m = vueModuleRe.exec(src)) !== null) {
      for (const name of m[1].split(',')) {
        const clean = name
          .trim()
          .replace(/^type\s+/, '')
          .split(/\s+as\s+/)[0]
        if (clean && clean !== 'default') vueNamedImports.add(clean)
      }
    }
  }

  // 2. 动态生成 shim（仅编译期占位）
  const shimPath = join(rootDir, '_gen_shim.d.ts')
  const shim = `declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
${[...vueNamedImports].map((n) => `  export type ${n} = any`).join('\n')}
}
declare module '*.css' {}
`
  await writeFile(shimPath, shim, 'utf-8')

  // 3. 编译并 emit 到 dist
  const program = ts.createProgram([...tsFiles, shimPath], parsed.options)

  const diags = ts.getPreEmitDiagnostics(program)
  const errors = diags.filter((d) => d.category === ts.DiagnosticCategory.Error)
  if (errors.length > 0) {
    for (const d of errors) {
      console.log(
        `  ⚠️  ${d.file?.fileName?.replace(rootDir + '/', '') ?? '?'}: ${typeof d.messageText === 'string' ? d.messageText : d.messageText.messageText}`,
      )
    }
  }

  program.emit(undefined, (fileName, text) => {
    mkdirSync(dirname(fileName), { recursive: true })
    let out = text.replace(/['"]@\/([^'"]+)['"]/g, (_, p) => {
      const target = join(distDir, p)
      const rel = relative(dirname(fileName), target).replace(/\\/g, '/')
      return `'${rel}'`
    })
    // TS6 rewriteRelativeImportExtensions 会把 import type X, { Y } 生成为无效语法
    // 修正为 import type { default as X, Y }
    out = out.replace(/import\s+type\s+([\w$]+)\s*,\s*\{([^}]+)\}\s*from/g, (_, name, bindings) => {
      const cleaned = bindings.replace(/\btype\s+/g, '')
      return `import type { default as ${name},${cleaned}} from`
    })
    if (fileName.endsWith('index.d.ts')) {
      out = out
        .split('\n')
        .filter((l) => !l.includes('assets/styles/') && !l.includes('assets/icons/'))
        .join('\n')
    }
    writeFileSync(fileName, separateDeclarations(dedent4to2(out)))
  })
  // 调试：检查 Menu.d.ts 的 emit 内容

  await rm(shimPath)

  // tsc 不会重新 emit 已有的 .d.ts 文件，手动拷贝源码 types 目录中的 .d.ts 到 dist
  const copyTypesDts = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'types') {
          for (const f of await readdir(full)) {
            if (f.endsWith('.d.ts')) {
              const dest = join(distDir, relative(srcDir, full), f)
              await mkdir(dirname(dest), { recursive: true })
              await writeFile(dest, await readFile(join(full, f), 'utf-8'))
            }
          }
        } else {
          await copyTypesDts(full)
        }
      }
    }
  }
  await copyTypesDts(srcDir)
}

async function main() {
  // 动态提取公共类型名（供组件渲染推导 import 用）
  await extractSharedTypeMap()

  // 清理旧的脚本产物：
  //   - dist 下的类型声明目录：凡是含 .d.ts 的子目录整目录删除（避免残留空目录/旧目录）
  //   - dist 根目录的 .d.ts 单文件逐个删除
  // 保留 assets、js、css 等 vite 构建产物
  const distRootEntries = await readdir(distDir, { withFileTypes: true })
  for (const entry of distRootEntries) {
    const full = join(distDir, entry.name)
    if (entry.isDirectory()) {
      const hasDts = await readdir(full).then(
        (files) => files.some((f) => f.endsWith('.d.ts')),
        () => false,
      )
      if (hasDts) await rm(full, { recursive: true, force: true })
    } else if (entry.name.endsWith('.d.ts')) {
      await rm(full, { force: true })
    }
  }

  // 管线 1：.vue → vue-component-meta 渲染
  const vueFiles = await scanVueFiles(componentsSrcDir)
  console.log(`找到 ${vueFiles.length} 个 .vue 文件`)

  let count = 0
  for (const file of vueFiles) {
    const rel = file.slice(srcDir.length + 1)
    const outPath = join(distDir, rel + '.d.ts')
    try {
      const vueSource = await readFile(file, 'utf-8')
      const meta = checker.getComponentMeta(file)
      const dts = dedent4to2(renderVueDts(vueSource, meta, outPath))
      await mkdir(dirname(outPath), { recursive: true })
      await writeFile(outPath, dts, 'utf-8')
      count++
      console.log(`  ✅ ${rel}.d.ts`)
    } catch (err) {
      console.log(`  ⚠️  ${rel} — ${err.message}`)
    }
  }

  // 管线 2：.ts → tsc 编译生成声明（types / utils / services / index）
  await compileTsDeclarations()
  console.log('  ✅ .ts 声明（types / utils / services / index）')

  console.log(`\n✨ 生成完成: ${count} 个组件`)
}

main().catch(console.error)
