import 'dotenv/config'
import mongoose from 'mongoose'
import Person from './models/person.js'

const [password, name, number, ...extra] = process.argv.slice(2)
if (!password || extra.length || Boolean(name) !== Boolean(number)) {
  console.error('Usage: node mongo.js <password> [name number]')
  process.exit(1)
}

const uri = (() => {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI
  const { MONGODB_HOST: host, MONGODB_USER: user, MONGODB_DATABASE: database } = process.env
  if (!host || !user || !database) {
    console.error('Set MONGODB_HOST, MONGODB_USER, and MONGODB_DATABASE')
    process.exit(1)
  }
  return `mongodb+srv://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}/${encodeURIComponent(database)}?retryWrites=true&w=majority`
})()

try {
  await mongoose.connect(uri)
  await Person.init()
  if (name) {
    const person = await new Person({ name, number }).save()
    console.log(`added ${person.name} number ${person.number} to phonebook`)
  } else {
    const persons = await Person.find({}).sort({ name: 1 })
    console.log('phonebook:')
    for (const person of persons) console.log(`${person.name} ${person.number}`)
  }
} catch (error) {
  console.error(error.name === 'ValidationError' ? error.message : 'Database operation failed')
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}
