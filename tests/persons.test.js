import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import supertest from 'supertest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
import app from '../app.js'
import Person from '../models/person.js'

let mongo
let api

before(async () => {
  mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } })
  await mongoose.connect(mongo.getUri())
  await Person.init()
  api = supertest(app)
})

beforeEach(async () => {
  await Person.deleteMany({})
})

after(async () => {
  await mongoose.disconnect()
  await mongo?.stop()
})

test('a newly created person is returned by GET and persists across requests', async () => {
  const created = await api.post('/api/persons').send({ name: 'Ada Lovelace', number: '12-345678' }).expect(201)
  assert.match(created.body.id, /^[a-f0-9]{24}$/)
  assert.deepEqual({ name: created.body.name, number: created.body.number }, { name: 'Ada Lovelace', number: '12-345678' })
  const list = await api.get('/api/persons').expect(200)
  assert.deepEqual(list.body, [created.body])
  const one = await api.get(`/api/persons/${created.body.id}`).expect(200)
  assert.deepEqual(one.body, created.body)
})

test('info counts MongoDB records and includes a request timestamp', async () => {
  await Person.create({ name: 'Ada', number: '12-345678' })
  const response = await api.get('/info').expect(200)
  assert.match(response.text, /Phonebook has info for 1 people/)
  assert.match(response.text, /\d{4}/)
})

test('missing, duplicate and invalid person data return useful 400 errors', async () => {
  await api.post('/api/persons').send({ number: '12-345678' }).expect(400)
  await api.post('/api/persons').send({ name: 'Ada' }).expect(400)
  await api.post('/api/persons').send({ name: 'Al', number: '12-345678' }).expect(400)
  for (const number of ['1-1234567', '1234-5678', '12-3a45678', '12345678']) {
    const invalid = await api.post('/api/persons').send({ name: 'Grace', number }).expect(400)
    assert.match(invalid.body.error, /number/i)
  }
  await api.post('/api/persons').send({ name: 'Ada', number: '12-345678' }).expect(201)
  const duplicate = await api.post('/api/persons').send({ name: 'Ada', number: '12-876543' }).expect(400)
  assert.match(duplicate.body.error, /name|already/i)
})

test('deleting a person persists and missing ids return 404', async () => {
  const person = await Person.create({ name: 'Ada', number: '12-345678' })
  await api.delete(`/api/persons/${person.id}`).expect(204)
  await api.get(`/api/persons/${person.id}`).expect(404)
  assert.equal((await api.get('/api/persons').expect(200)).body.length, 0)
  await api.delete(`/api/persons/${person.id}`).expect(404)
})

test('malformed ids return 400 for GET, PUT, and DELETE', async () => {
  await api.get('/api/persons/bad-id').expect(400)
  await api.put('/api/persons/bad-id').send({ name: 'Ada', number: '12-345678' }).expect(400)
  await api.delete('/api/persons/bad-id').expect(400)
})

test('PUT changes a number in MongoDB and validates both fields', async () => {
  const person = await Person.create({ name: 'Ada', number: '12-345678' })
  const updated = await api.put(`/api/persons/${person.id}`).send({ name: 'Ada', number: '123-98765' }).expect(200)
  assert.equal(updated.body.number, '123-98765')
  assert.equal((await api.get(`/api/persons/${person.id}`).expect(200)).body.number, '123-98765')
  await api.put(`/api/persons/${person.id}`).send({ number: '12-345678' }).expect(400)
  await api.put(`/api/persons/${person.id}`).send({ name: 'Al', number: '12-345678' }).expect(400)
  await api.put(`/api/persons/${person.id}`).send({ name: 'Ada', number: '12-123' }).expect(400)
  assert.equal((await api.get(`/api/persons/${person.id}`).expect(200)).body.number, '123-98765')
})

test('PUT handles missing record and duplicate name', async () => {
  const first = await Person.create({ name: 'Ada', number: '12-345678' })
  const second = await Person.create({ name: 'Grace', number: '12-876543' })
  const missing = new mongoose.Types.ObjectId()
  await api.put(`/api/persons/${missing}`).send({ name: 'Alan', number: '12-345678' }).expect(404)
  await api.put(`/api/persons/${second.id}`).send({ name: 'Ada', number: '12-876543' }).expect(400)
  assert.equal((await Person.findById(first.id)).name, 'Ada')
})


test('mongo CLI adds and lists records in the supplied temporary database', async () => {
  const env = { ...process.env, MONGODB_URI: mongo.getUri() }
  const added = await execFileAsync(process.execPath, ['mongo.js', 'unused', 'Marie Curie', '12-123456'], { env })
  assert.match(added.stdout, /Marie Curie.*12-123456/)
  const listed = await execFileAsync(process.execPath, ['mongo.js', 'unused'], { env })
  assert.match(listed.stdout, /Marie Curie.*12-123456/)
  assert.doesNotMatch(added.stdout + listed.stdout, /mongodb:\/\//)
})

test('empty POST and PUT bodies return 400 rather than a server error', async () => {
  await api.post('/api/persons').expect(400)
  const person = await Person.create({ name: 'Ada', number: '12-345678' })
  await api.put(`/api/persons/${person.id}`).expect(400)
})
