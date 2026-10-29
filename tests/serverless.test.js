import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { MongoMemoryServer } from 'mongodb-memory-server'

const execFileAsync = promisify(execFile)
let mongo

before(async () => {
  mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } })
})

after(async () => {
  await mongo?.stop()
})

async function runColdApp(script, database) {
  return execFileAsync(process.execPath, ['--input-type=module', '--eval', `
    import assert from 'node:assert/strict'
    import mongoose from 'mongoose'
    import supertest from 'supertest'
    mongoose.set('bufferTimeoutMS', 250)
    const { default: app } = await import('./app.js')
    const api = supertest(app)
    try {
      ${script}
    } finally {
      await mongoose.disconnect()
    }
  `], {
    cwd: new URL('../', import.meta.url),
    env: { ...process.env, MONGODB_URI: mongo.getUri(database) },
    timeout: 15000,
  })
}

test('cold API requests wait for MongoDB and the unique name index', async () => {
  await runColdApp(`
    const responses = await Promise.all([
      api.post('/api/persons').send({ name: 'Cold Start', number: '12-345678' }),
      api.post('/api/persons').send({ name: 'Cold Start', number: '12-876543' }),
    ])
    assert.deepEqual(responses.map(response => response.status).sort(), [201, 400])
    const list = await api.get('/api/persons').expect(200)
    assert.equal(list.body.length, 1)
    assert.equal(list.body[0].name, 'Cold Start')
    await api.get('/info').expect(200).expect(/Phonebook has info for 1 people/)
  `, 'cold_start')
})

test('failed database initialization returns a private error and permits retry', async () => {
  const { stdout, stderr } = await runColdApp(`
    const validUri = process.env.MONGODB_URI
    process.env.MONGODB_URI = 'mongodb://synthetic-user:synthetic-secret@127.0.0.1:1/unavailable?serverSelectionTimeoutMS=50'
    const unavailable = await api.get('/api/persons').expect(503)
    assert.match(unavailable.body.error, /database|unavailable/i)
    assert.doesNotMatch(unavailable.text, /synthetic-secret|mongodb:|127\\.0\\.0\\.1/)
    process.env.MONGODB_URI = validUri
    const recovered = await api.get('/api/persons').expect(200)
    assert.deepEqual(recovered.body, [])
  `, 'retry_start')
  assert.doesNotMatch(stdout + stderr, /synthetic-secret|mongodb:\/\//)
})

test('failed index initialization can recover after conflicting data is repaired', async () => {
  await runColdApp(`
    const maintenance = await mongoose.createConnection(process.env.MONGODB_URI).asPromise()
    try {
      const collection = maintenance.db.collection('people')
      await collection.insertMany([
        { name: 'Index Retry', number: '12-345678' },
        { name: 'Index Retry', number: '12-876543' },
      ])
      await api.get('/info').expect(503)
      await collection.deleteOne({ number: '12-876543' })
      await api.get('/info').expect(200).expect(/Phonebook has info for 1 people/)
      await api.post('/api/persons')
        .send({ name: 'Index Retry', number: '12-876543' }).expect(400)
    } finally {
      await maintenance.close()
    }
  `, 'index_retry')
})
