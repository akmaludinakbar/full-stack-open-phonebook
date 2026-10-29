import { cp, mkdir, rm, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'frontend', 'dist')
const output = process.argv[2] || 'dist'
const target = join(root, output)
await stat(join(source, 'index.html'))
await rm(target, { recursive: true, force: true })
await mkdir(target, { recursive: true })
await cp(source, target, { recursive: true })
console.log(`Copied frontend production build to backend/${output}`)
