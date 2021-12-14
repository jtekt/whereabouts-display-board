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

exports.get_members_of_group = (socket) => {
  return (message) => {
    let user_records = []

    const group_id = message.group_id
    if(!group_id) return console.log(`Missing group ID`)

    console.log(`[WS] Members of group ${group_id} requested`)

    // Fetching members using the group manager API
    const url = `${process.env.GROUP_MANAGER_API_URL}/groups/${group_id}/members`
    const options = {headers: {Authorization: `Bearer ${socket.jwt}`}}
    axios.get(url, options)
    .then((response) => {

      // Join and leave rooms
      manage_rooms(socket, group_id)

      user_records = response.data

      const query = {
        $or: user_records.map( record => {
          const user = record._fields[record._fieldLookup.user]
          const user_id = get_id_of_item(user)
          return { user_id }
        })
      }

      return Whereabouts.find(query)
    })
    .then(entries => {

      let entries_mapping = {}
      entries.forEach((entry) => {
        entries_mapping[entry.user_id] = entry
      })

      user_records.forEach( (record) => {
        const user = record._fields[record._fieldLookup.user]
        const user_id = get_id_of_item(user)

        user.whereabouts = entries_mapping[user_id]
          ||  {
            availability: 'absent',
            message: 'unknown',
          }
      })

      socket.emit('members_of_group', user_records)
    })
    .catch( (error) => {
      if(error.response) console.log(error.response.data)
      else console.log(error)
    })

  }
}
