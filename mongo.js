const mongoose = require("mongoose")
const dotenv = require("dotenv")

dotenv.config()

const {
  MONGODB_CONNECTION_STRING,
  MONGODB_PROTOCOL = "mongodb",
  MONGODB_USERNAME,
  MONGODB_PASSWORD,
  MONGODB_HOST = "localhost",
  MONGODB_PORT,
  MONGODB_DB = "whereabouts",
  MONGODB_OPTIONS = "",
} = process.env

const mongodb_options = {
  useUnifiedTopology: true,
  useNewUrlParser: true,
  useFindAndModify: false,
}

const mongodbPort = MONGODB_PORT ? `:${MONGODB_PORT}` : ""

const connectionString =
  MONGODB_CONNECTION_STRING ||
  (MONGODB_USERNAME && MONGODB_PASSWORD
    ? `${MONGODB_PROTOCOL}://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_HOST}${mongodbPort}/${MONGODB_DB}${MONGODB_OPTIONS}`
    : `${MONGODB_PROTOCOL}://${MONGODB_HOST}${mongodbPort}/${MONGODB_DB}${MONGODB_OPTIONS}`)

const redactedConnectionString = connectionString.replace(/:.*@/, "://***:***@")

mongoose.set("useCreateIndex", true)

function mongoose_connect() {
  console.log(
    `[MongoDB] Attempting connection to ${redactedConnectionString}...`
  )
  mongoose
    .connect(connectionString, mongodb_options)
    .then(() => {
      console.log("[Mongoose] Initial connection successful")
    })
    .catch((error) => {
      console.log("[Mongoose] Initial connection failed")
      setTimeout(mongoose_connect, 5000)
    })
}

mongoose_connect()

const db = mongoose.connection
db.on("error", console.error.bind(console, "connection error:"))
db.once("open", () => {
  console.log(`[Mongoose] MongoDB connected`)
})

exports.connected = () => mongoose.connection.readyState
exports.redactedConnectionString = redactedConnectionString
