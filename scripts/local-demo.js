import { spawn } from 'node:child_process'
import { MongoMemoryServer } from 'mongodb-memory-server'

const mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } })
const port = process.env.PORT || '3001'
const server = spawn(process.execPath, ['index.js'], {
  cwd: new URL('../', import.meta.url),
  env: { ...process.env, MONGODB_URI: mongo.getUri(), PORT: port },
  stdio: 'inherit',
})
console.log(`Temporary nonpersistent MongoDB started; open http://localhost:${port}`)

let stopping = false
async function stop() {
  if (stopping) return
  stopping = true
  server.kill('SIGTERM')
  await mongo.stop()
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
server.on('exit', async code => {
  await stop()
  process.exitCode = code || 0
})
