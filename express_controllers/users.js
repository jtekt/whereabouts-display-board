const dotenv = require('dotenv')
const io = require('../main.js').io
const axios = require('axios')
const Whereabouts = require('../models/whereabouts.js')

dotenv.config()

const update_rooms_of_user = (user_record, jwt) => {
  // Sends a WS event to all members of the room (group) an updated user is part of

  const user = user_record._fields[user_record._fieldLookup.employee]
  const user_id = user.identity.low ?? user.identity

  if(!user_id && user_id !== 0) return console.log(`User does not have an ID`)

  const url = `${process.env.GROUP_MANAGER_API_URL}/members/${user_id}/groups`
  const options = { headers: {"Authorization" : `Bearer ${jwt}`} }

  axios.get(url, options)
  .then((response) => {

    const records = response.data
    console.log(`Updating ${records.length} rooms (groups) for user ${user_id}`)

    records.forEach((record) => {

      const group = record._fields[record._fieldLookup.group]
      const group_id = group.identity.low ?? group.identity

      // needs to be an array of users
      io.in(String(group_id)).emit('members_of_group',[user_record])

    })
  })
  .catch( (error) => {
    console.log(`Error Updating rooms for user ${user_id}: ${error}`)
  })

}

function get_jwt(req) {
  let jwt = req.body.jwt
    || req.body.token
    || req.query.jwt
    || req.query.token


  if(!jwt) {
    // Check if auth header is set
    if(!req.headers.authorization) {
      console.log(`JWT not found in query or body and uuthorization header not set`)
      return undefined
    }

    // Retrieve JWT from auth header
    jwt = req.headers.authorization.split(" ")[1]
  }

  return jwt
}


exports.update_whereabouts = (req, res) => {

  // 1. Decode JWT to get a user ID
  // 2. Get the target user ID and check if authorized to edit
  // 3. Get the target user
  // 4. Update MongoDB
  // 5. Merge MongoDB entry in user record
  // 6. Emit

  // User record needs to be passed further down the promise chain
  let user_record = {}

  const jwt = get_jwt(req)

  // If no token, forbid further access
  if(!jwt) {
    console.log(`JWT not found`)
    return res.status(403).send(`JWT not found`)
  }

  // Retrieve the user ID from the JWT
  const jwt_decoding_url = `${process.env.AUTHENTICATION_API_URL}/user_from_jwt`
  const options = {params: {jwt}}

  axios.get(jwt_decoding_url,options)
  .then( (response) => {

    // Use the provided user ID if available. Otherwise use that of the JWT
    // Are there cases where update is for another user?

    const jwt_owner = response.data
    const jwt_owner_id = jwt_owner.identity.low // old Neo4J syntax
      ?? jwt_owner.identity // New Neo4J syntax

    const user_id = req.params.user_id
      ?? req.query.user_id
      ?? req.body.user_id
      ?? jwt_owner_id

    if(!user_id) {
      console.log(`User ID not specified`)
      return res.status(400).send('User ID not specified')
    }

    if(String(jwt_owner_id) !== String(user_id) && !jwt_owner.properties.isAdmin){
      console.log(`Unauthorized attempt to modify user ${user_id} from user ${jwt_owner_id}`)
      return res.status(403).send(`Unauthorized to modify another user`)
    }


    const url = `${process.env.EMPLOYEE_MANAGER_API_URL}/employees/${user_id}`
    const options = {headers: {Authorization: `Bearer ${jwt}`}}

    return axios.get(url, options)
  })
  .then(response => {

    user_record = response.data[0]
    const user = user_record._fields[user_record._fieldLookup['employee']]
    const user_id = user.identity.low ?? user.identity
    // Retrieve the user info from the user manager

    const message = req.body.message
      || req.body.current_location
      || req.query.current_location
      || req.query.message

    const availability = req.body.availability
      || req.body.presence
      || req.query.availability
      || req.query.presence

    if(!message && !availability) {
      return res.status(400).send(`Nothing to update`)
    }

    const filter = { user_id }
    let update = { $set:
      {
        last_update: new Date(),
      }
    }

    if(message) update.message = message
    if(availability) update.availability = availability

    const options = {
      new: true,
      upsert: true,
    }

    return Whereabouts.findOneAndUpdate(filter, update, options)

  })
  .then(result => {
    console.log(`[Mongoose] whereabouts of user ${result.user_id} updated`)
    res.send(user_record)

    user_record._fields[user_record._fieldLookup['employee']].whereabouts = result

    // JWT needed because querying goups of user to update corresponding rooms
    update_rooms_of_user(user_record, jwt)
  })
  .catch( (error) => {
    console.log(error)
    return res.status(403).send(error)
  })

}


exports.db_import = (req, res) => {

  const jwt = get_jwt(req)

  // If no token, forbid further access
  if(!jwt) {
    console.log(`JWT not found`)
    return res.status(403).send(`JWT not found`)
  }

  // Retrieve the user ID from the JWT
  const jwt_decoding_url = `${process.env.AUTHENTICATION_API_URL}/user_from_jwt`
  const options = {params: {jwt}}

  axios.get(jwt_decoding_url,options)
  .then( (response) => {

    // Use the provided user ID if available. Otherwise use that of the JWT
    // Are there cases where update is for another user?

    const jwt_owner = response.data


    if(!jwt_owner.properties.isAdmin){
      console.log(`Unauthorized unless admin`)
      return res.status(403).send(`Unauthorized unless admin`)
    }

    res.send('processing')

    req.body.forEach((entry) => {

      const filter = { user_id: entry.user_id }
      const update = { $set:
        {
          availability: entry.availability ?? 'unavailable',
          message: entry.message ?? 'unknown',
          last_update: entry.last_update ?? new Date(),
        }
      }
      const options = {
        new: true,
        upsert: true
      }

      //console.log(update)


      Whereabouts.findOneAndUpdate(filter, update, options)
      .then((result) => {
        console.log(update)
      })
      .catch((error) => {
        console.log(error)
      })


    })







  })


  .catch( (error) => {
    console.log(error)
    return res.status(403).send(error)
  })

}
