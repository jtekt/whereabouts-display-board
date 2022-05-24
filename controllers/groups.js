const io = require('../main.js').io
const axios = require('axios')
const Whereabouts = require('../models/whereabouts.js')
const { get_id_of_item } = require('../utils.js')
const dotenv = require('dotenv')

dotenv.config()

const {
  GROUP_MANAGER_API_URL,
} = process.env

const manage_rooms = (socket, group_id) => {
  // leave previous room
  for (var room in socket.rooms) {
    if(room !== socket.id && room !== 'authenticated') {
      console.log(`[WS] Socket ${socket.id} left room ${room}`)
      socket.leave(room)
    }
  }

  // Joining new room
  socket.join(group_id, () => {
    console.log(`[WS] Socket ${socket.id} has joined room ${group_id}`)
  })
}

exports.get_members_of_group = (socket) => (message) => {

  let users = []

  const group_id = message.group_id
  if(!group_id) return console.log(`Missing group ID`)

  console.log(`[WS] Members of group ${group_id} requested`)

  // Fetching members using the group manager API
  const url = `${GROUP_MANAGER_API_URL}/v3/groups/${group_id}/members`
  const params = {batch_size: -1}
  const headers = {Authorization: `Bearer ${socket.jwt}`}

  axios.get(url, {headers, params})
  .then(({data}) => {

    users = data.items

    if(!users.length) return []

    // Join and leave rooms
    manage_rooms(socket, group_id)

    const query = { $or: users.map( ({_id}) => ({user_id: _id}) ) }

    return Whereabouts.find(query)
  })
  .then(entries => {

    // Could use reduce
    let entries_mapping = {}
    entries.forEach((entry) => { entries_mapping[entry.user_id] = entry })

    users.forEach( (user) => {
      const user_id = get_id_of_item(user)

      user.whereabouts = entries_mapping[user_id]
        ||  { availability: 'absent', message: 'unknown' }
    })

    // Emitting to single socket
    socket.emit('members_of_group', users)
  })
  .catch( (error) => {
    let message
    if(error.response) message = error.response.data
    else message = error
    socket.emit('error_message', message)
    console.error(message)
  })

}
