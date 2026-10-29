import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import mongoose from 'mongoose'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import Person from './models/person.js'

const app = express()
const directory = dirname(fileURLToPath(import.meta.url))
let databaseReady

function initializeDatabase() {
  databaseReady ??= (async () => {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI)
    }
    await Person.init()
  })().catch(async () => {
    try {
      // Closing also clears Mongoose's cached model initialization failure.
      await mongoose.connection.close()
    } finally {
      databaseReady = undefined
    }
    throw new Error('Database unavailable')
  })
  return databaseReady
}

app.use(cors())
app.use(express.json())
morgan.token('post-body', request => request.method === 'POST' ? JSON.stringify(request.body) : '')
app.use(morgan(':method :url :status :res[content-length] - :response-time ms :post-body'))
app.use(express.static(join(directory, 'dist')))

app.use(['/api', '/info'], async (_request, response, next) => {
  try {
    await initializeDatabase()
    next()
  } catch {
    response.status(503).json({ error: 'Database unavailable' })
  }
})

app.get('/api/persons', async (_request, response, next) => {
  try {
    response.json(await Person.find({}))
  } catch (error) {
    next(error)
  }
})

app.get('/info', async (_request, response, next) => {
  try {
    const count = await Person.countDocuments({})
    response.type('html').send(`<p>Phonebook has info for ${count} people</p><p>${new Date().toString()}</p>`)
  } catch (error) {
    next(error)
  }
})

app.get('/api/persons/:id', async (request, response, next) => {
  try {
    const person = await Person.findById(request.params.id)
    if (!person) return response.status(404).end()
    response.json(person)
  } catch (error) {
    next(error)
  }
})

app.post('/api/persons', async (request, response, next) => {
  try {
    const body = request.body || {}
    const person = new Person({ name: body.name, number: body.number })
    response.status(201).json(await person.save())
  } catch (error) {
    next(error)
  }
})

app.put('/api/persons/:id', async (request, response, next) => {
  try {
    const body = request.body || {}
    if (!body.name || !body.number) {
      return response.status(400).json({ error: 'name and number are required' })
    }
    const person = await Person.findByIdAndUpdate(
      request.params.id,
      { name: body.name, number: body.number },
      { returnDocument: 'after', runValidators: true, context: 'query' },
    )
    if (!person) return response.status(404).end()
    response.json(person)
  } catch (error) {
    next(error)
  }
})

app.delete('/api/persons/:id', async (request, response, next) => {
  try {
    const person = await Person.findByIdAndDelete(request.params.id)
    if (!person) return response.status(404).end()
    response.status(204).end()
  } catch (error) {
    next(error)
  }
})

app.use((_request, response) => response.status(404).json({ error: 'unknown endpoint' }))

app.use((error, _request, response, next) => {
  if (error.name === 'CastError') return response.status(400).json({ error: 'malformatted id' })
  if (error.name === 'ValidationError') return response.status(400).json({ error: error.message })
  if (error.code === 11000) return response.status(400).json({ error: 'name already exists' })
  if (error instanceof SyntaxError && error.status === 400) return response.status(400).json({ error: 'invalid JSON' })
  next(error)
})

export default app
