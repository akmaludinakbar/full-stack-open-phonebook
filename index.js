import 'dotenv/config'
import mongoose from 'mongoose'
import app from './app.js'

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('MONGODB_URI is required')
  process.exit(1)
}

const port = Number(process.env.PORT || 3001)
try {
  await mongoose.connect(uri)
  await mongoose.model('Person').init()
  app.listen(port, () => console.log(`Phonebook API listening on port ${port}`))
} catch {
  console.error('Database connection failed')
  process.exit(1)
}
