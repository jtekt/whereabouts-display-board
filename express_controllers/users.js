const dotenv = require('dotenv')
const io = require('../main.js').io
const axios = require('axios')

dotenv.config()

let update_rooms_of_user = (user_record, jwt) => {

  let user = user_record._fields[user_record._fieldLookup.employee]

  let user_id = user.identity.low
  if(!user_id) return console.log(`User does not have an ID`)

  let url = `${process.env.GROUP_MANAGER_API_URL}/members/${user_id}/groups`
  let options = { headers: {"Authorization" : `Bearer ${jwt}`} }

  io.emit('debug', 'User patched')

  axios.get(url, options)
  .then((response) => {

    let records = response.data
    console.log(`Updating ${records.length} rooms (groups) for user ${user_id}`)


    records.forEach((record) => {

      let group = record._fields[record._fieldLookup.group]
      let group_id = group.identity.low



      // needs to be an array of users
      io.in(String(group_id)).emit('members_of_group',[user_record])

    })
  })
  .catch( (error) => {
    console.log(`Error Updating rooms for user ${user_id}: ${error}`)
  })


}

exports.update_user = (req, res) => {

  if(!req.headers.authorization) {
    console.log(`Authorization header not set`)
    return res.status(403).send(`Authorization header not set`)
  }

  let jwt = req.headers.authorization.split(" ")[1]
  if(!jwt) {
    console.log(`JWT not found`)
    return res.status(403).send(`JWT not found`)
  }

  let user_id = req.params.user_id
  let url = `${process.env.EMPLOYEE_MANAGER_API_URL}/employees/${user_id}`
  let body = {
    current_location: req.body.current_location,
    presence: req.body.presence,
  }

  console.log(`PATCHing user ${user_id}`)

  axios.patch(url, body, { headers: {"Authorization" : `Bearer ${jwt}`} })
  .then((response) => {
    console.log(`User ${user_id} has been PATCHed`)

    let record = response.data[0]
    let user = record._fields[record._fieldLookup.employee]

    // respond with the user
    res.send(user)

    io.emit('debug', {message: 'User patched', user: user})

    // Update rooms related to user
    update_rooms_of_user(record, jwt)

  })
  .catch((error) => {
    res.status(500).send(error)
    if(error.response) console.log(error.response.data)
    else console.log(error)
  })

}
