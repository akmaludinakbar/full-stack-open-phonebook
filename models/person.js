import mongoose from 'mongoose'

const personSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 3,
    unique: true,
  },
  number: {
    type: String,
    required: true,
    minlength: 8,
    validate: {
      validator: value => /^\d{2,3}-\d+$/.test(value),
      message: 'number must start with 2 or 3 digits, a hyphen, then digits',
    },
  },
})

personSchema.set('toJSON', {
  transform: (_document, returned) => {
    returned.id = returned._id.toString()
    delete returned._id
    delete returned.__v
  },
})

export default mongoose.model('Person', personSchema)
