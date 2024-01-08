const dotenv = require("dotenv")
dotenv.config()

const express = require("express")
require("express-async-errors")

const http = require("http")
const socketio = require("socket.io")
const cors = require("cors")
const bodyParser = require("body-parser")

const mongo = require("./mongo.js")
const { version, author } = require("./package.json")
const ws_auth = require("@moreillon/socketio_authentication_middleware")
const promBundle = require("express-prom-bundle")

console.log(`行先掲示板 v${version}`)

const {
  APP_PORT = 80,
  IDENTIFICATION_URL,
  GROUP_MANAGER_API_URL = "UNDEFINED",
  EMPLOYEE_MANAGER_API_URL = "UNDEFINED",
} = process.env
const promOptions = { includeMethod: true, includePath: true }

const app = express()
const http_server = http.createServer(app)
const io = socketio(http_server)
exports.io = io

const { update_whereabouts } = require("./controllers/users.js")
const group_controllers = require("./controllers/groups.js")
const auth_controllers = require("./controllers/auth.js")

app.use(cors())
app.use(bodyParser.json())
app.use(promBundle(promOptions))

app.get("/", (req, res) => {
  res.send({
    application_name: "行先掲示板",
    author,
    version,
    authentication: {
      identification_url: IDENTIFICATION_URL,
    },
    group_manager_api_url: GROUP_MANAGER_API_URL,
    employee_manager_api_url: EMPLOYEE_MANAGER_API_URL,
    mongodb: {
      url: mongo.redactedConnectionString,
      connected: mongo.connected(),
    },
  })
})

// Express

app.route("/users/:user_id").patch(update_whereabouts).put(update_whereabouts) // alias

app.route("/update").get(update_whereabouts) // alternative so as to use a GET request, legacy

// Express error handler
app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.statusCode).send(err.message)
})

// Websockets

io.on("connection", (socket) => {
  // TODO: simplifiy auth
  socket.use(ws_auth(socket, auth_controllers.auth(socket)))

  socket.on(
    "get_members_of_group",
    group_controllers.get_members_of_group(socket)
  )
})

// Start listening
http_server.listen(APP_PORT, () => {
  console.log(`[Express] Listening on *:${APP_PORT}`)
})

exports.http_server = http_server
