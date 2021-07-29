const mongoose = require('mongoose')
const dotenv = require('dotenv')

dotenv.config()

const mongodb_url = process.env.MONGODB_URL || 'mongodb://mongo'
const mongodb_db = process.env.MONGODB_DB || 'whereabouts'
const mongodb_options = {
   useUnifiedTopology: true,
   useNewUrlParser: true,
   useFindAndModify: false,
}

mongoose.set('useCreateIndex', true)

function mongoose_connect(){
  console.log('[MongoDB] Attempting connection...')
  mongoose.connect(`${mongodb_url}/${mongodb_db}`, mongodb_options)
  .then(() => {console.log('[Mongoose] Initial connection successful')})
  .catch(error => {
    console.log('[Mongoose] Initial connection failed')
    setTimeout(mongoose_connect,5000)
  })
}

mongoose_connect()

const db = mongoose.connection
db.on('error', console.error.bind(console, 'connection error:'))
db.once('open', () => { console.log(`[Mongoose] MongoDB connected`) })

exports.db = mongodb_db
exports.url = mongodb_url
exports.connected = () => mongoose.connection.readyState
