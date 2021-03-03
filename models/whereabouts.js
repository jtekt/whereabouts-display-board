const mongoose = require('mongoose')

const whereaboutsSchema = new mongoose.Schema({
  user_id: String,
  availability: String,
  message: String,
  last_update: Date,
})

whereaboutsSchema.index({ user_id: 1 }, { unique: true })


const Whereabouts = mongoose.model('whereabouts', whereaboutsSchema)

module.exports = Whereabouts
