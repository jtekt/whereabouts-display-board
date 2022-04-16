const io = require('../main.js').io
const axios = require('axios')
const Whereabouts = require('../models/whereabouts.js')
const { get_id_of_item } = require('../utils.js')

const manage_rooms = (socket, group_id) => {
  // leave previous room
  for (var room in socket.rooms) {
    if(room !== socket.id && room !== 'authenticated') {
      console.log(`[WS] Socket ${socket.id} left room ${room}`)
      delete room
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
  const url = `${process.env.GROUP_MANAGER_API_URL}/v3/groups/${group_id}/members`
  const headers = {Authorization: `Bearer ${socket.jwt}`}
  axios.get(url, {headers})
  .then(({data}) => {

    users = data.items

    // Join and leave rooms
    manage_rooms(socket, group_id)

    const query = {
      $or: users.map( ({_id}) => ({user_id: _id}) )
    }

    return Whereabouts.find(query)
  })
  .then(entries => {

    let entries_mapping = {}
    entries.forEach((entry) => {
      entries_mapping[entry.user_id] = entry
    })

    users.forEach( (user) => {
      const user_id = get_id_of_item(user)

      user.whereabouts = entries_mapping[user_id]
        ||  {
          availability: 'absent',
          message: 'unknown',
        }
    })

    socket.emit('members_of_group', users)
  })
  .catch( (error) => {
    if(error.response) console.log(error.response.data)
    else console.log(error)
  })

}
