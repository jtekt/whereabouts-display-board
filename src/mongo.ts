import mongoose from "mongoose"

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

const mongodbPort = MONGODB_PORT ? `:${MONGODB_PORT}` : ""

const connectionString =
  MONGODB_CONNECTION_STRING ??
  (MONGODB_USERNAME && MONGODB_PASSWORD
    ? `${MONGODB_PROTOCOL}://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_HOST}${mongodbPort}/${MONGODB_DB}${MONGODB_OPTIONS}`
    : `${MONGODB_PROTOCOL}://${MONGODB_HOST}${mongodbPort}/${MONGODB_DB}${MONGODB_OPTIONS}`)

export const redactedConnectionString = connectionString.replace(
  /:.*@/,
  "://***:***@"
)

function mongoose_connect(): void {
  console.log(`[MongoDB] Attempting connection to ${redactedConnectionString}...`)
  mongoose
    .connect(connectionString)
    .then(() => console.log("[Mongoose] Initial connection successful"))
    .catch(() => {
      console.log("[Mongoose] Initial connection failed, retrying in 5s...")
      setTimeout(mongoose_connect, 5000)
    })
}

mongoose_connect()

mongoose.connection.on("error", (err) =>
  console.error("connection error:", err)
)
mongoose.connection.once("open", () =>
  console.log("[Mongoose] MongoDB connected")
)

export const connected = (): number => mongoose.connection.readyState
