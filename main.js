const express = require('express')
const http = require('http')
const socketio = require('socket.io')
const cors = require('cors')
const bodyParser = require('body-parser')
const dotenv = require('dotenv')

dotenv.config()

const APP_PORT = process.env.APP_PORT || 80

const app = express()
const http_server = http.createServer(app)
const io = socketio(http_server)
exports.io = io

app.use(cors())
app.use(bodyParser.json())



// Express
const express_users_controller = require('./express_controllers/users.js')
const express_groups_controller = require('./express_controllers/groups.js')


app.get('/', (req, res) => {
  res.send({
    application_name: '行先掲示板',
    author: 'Maxime MOREILLON',
    version: require('./package.json').version,
    authentication_api_url: process.env.AUTHENTICATION_API_URL,
    group_manager_api_url: process.env.GROUP_MANAGER_API_URL,
    employee_manager_api_url: process.env.EMPLOYEE_MANAGER_API_URL,
  })
})


// For people updating themselves using a script or something else
app.route('/users/:user_id')
  .patch(express_users_controller.update_user)

app.route('/members/:user_id/groups')
  .get(express_groups_controller.get_groups_of_user)

// TODO: Route for login

// Websockets
const ws_users_controllers = require('./ws_controllers/users.js')
const groups_controllers = require('./ws_controllers/groups.js')

io.on('connection', (socket) => {
  console.log('[WS] a user connected')

  socket.on('authenticate', () => console.log('Auth')) // THIS WILL BE DONE USING THE AUTH MIDDLEWARE

  socket.on('update_user', ws_users_controllers.update_user)
  socket.on('get_members_of_group', groups_controllers.get_members_of_group(socket))
})

// Start listening
http_server.listen(APP_PORT, () => {
  console.log(`行先掲示板 Listening on *:${APP_PORT}`);
})
