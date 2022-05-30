const { Schema, model } = require('mongoose')

const schema = new Schema({
  user_id: {type: String, required: true},
  availability: String,
  message: String,
  last_update: { type: Date, default: Date.now},
})

schema.index({ user_id: 1 }, { unique: true })


const Whereabouts = model('whereabouts', schema)

module.exports = Whereabouts
