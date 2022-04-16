const express = require('express')
const http = require('http')
const socketio = require('socket.io')
const cors = require('cors')
const bodyParser = require('body-parser')
const dotenv = require('dotenv')
const apiMetrics = require('prometheus-api-metrics')
const mongo = require('./mongo.js')
const { version, author } = require('./package.json')
const ws_auth = require('@moreillon/socketio_authentication_middleware')

dotenv.config()

const {
  APP_PORT = 80,
  AUTHENTICATION_API_URL = 'UNDEFINED',
  GROUP_MANAGER_API_URL = 'UNDEFINED',
  EMPLOYEE_MANAGER_API_URL = 'UNDEFINED',
} = process.env

console.log(`行先掲示板 v${version}`)

const app = express()
const http_server = http.createServer(app)
const io = socketio(http_server)
exports.io = io


app.use(cors())
app.use(bodyParser.json())
app.use(apiMetrics())





app.get('/', (req, res) => {
  res.send({
    application_name: '行先掲示板',
    author,
    version,
    authentication_api_url: AUTHENTICATION_API_URL,
    group_manager_api_url: GROUP_MANAGER_API_URL,
    employee_manager_api_url: EMPLOYEE_MANAGER_API_URL,
    mongodb: {
      url: mongo.url,
      db: mongo.db,
      connected: mongo.connected(),
    }
  })
})


// Express
const express_users_controller = require('./express_controllers/users.js')

app.route('/users/:user_id')
  .patch(express_users_controller.update_whereabouts)
  .put(express_users_controller.update_whereabouts) // alias

app.route('/update')
  .get(express_users_controller.update_whereabouts) // alternative so as to use a GET request, legacy


// Websockets
const ws_groups_controllers = require('./ws_controllers/groups.js')
const ws_auth_controllers = require('./ws_controllers/auth.js')

io.on('connection', (socket) => {
  console.log('[WS] a user connected')

  // This is too complex
  socket.use(ws_auth(socket, ws_auth_controllers.auth(socket)))

  socket.on('get_members_of_group', ws_groups_controllers.get_members_of_group(socket))
})

// Start listening
http_server.listen(APP_PORT, () => {
  console.log(`[Express] Listening on *:${APP_PORT}`)
})
