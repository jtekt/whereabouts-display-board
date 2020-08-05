const io = require('../main.js').io
const axios = require('axios')


let manage_rooms = (socket, group_id) => {
  // leave previous room
  for (var room in socket.rooms) {
    if(room !== socket.id && room !== 'authenticated') {
      console.log(`Socket ${socket.id} left room ${room}`)
      delete room
    }
  }

  // Joining new room
  socket.join(group_id, () => {
    console.log(`Socket ${socket.id} has joined room ${group_id}`)

    // DEBUG
    socket.emit('rooms', socket.rooms)
  })
}

exports.get_members_of_group = (socket) => {
  return (message) => {

    let group_id = message.group_id
    if(!group_id) return console.log(`Missing group ID`)

    console.log(`Members of group ${group_id} requested`)

    // Fetching members using the group manager API
    let url = `${process.env.GROUP_MANAGER_API_URL}/groups/${group_id}/members`
    axios.get(url, {headers: {Authorization: `Bearer ${socket.jwt}`}})
    .then((response) => {

      // Join and leave rooms
      manage_rooms(socket, group_id)

      // Respond with the group members
      socket.emit('members_of_group', response.data)
    })
    .catch( (error) => {
      if(error.response) console.log(error.response.data)
      else console.log(error)
    })

  }
}
