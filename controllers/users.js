const dotenv = require('dotenv')
const { io } = require('../main.js')
const axios = require('axios')
const Whereabouts = require('../models/whereabouts.js')
const { get_id_of_item } = require('../utils.js')
const createHttpError = require('http-errors')

dotenv.config()

const {
  AUTHENTICATION_API_URL,
  IDENTIFICATION_URL,
  EMPLOYEE_MANAGER_API_URL,
  GROUP_MANAGER_API_URL,
} = process.env

const update_rooms_of_user = (user, jwt) => {
  // Sends a WS event to all members of the room (group) an updated user is part of

  const user_id = get_id_of_item(user)

  if(!user_id && user_id !== 0) throw `User does not have an ID`

  const url = `${GROUP_MANAGER_API_URL}/v3/members/${user_id}/groups`
  const headers = {"Authorization" : `Bearer ${jwt}`}

  axios.get(url, {headers})
  .then( ({data: {items: groups}})  => {

    console.log(`[WS] Updating ${groups.length} rooms (groups) for user ${user_id}`)

    groups.forEach( ({_id}) => {

      // needs to be an array of users
      io.in(String(_id)).emit('members_of_group',[user])

    })
  })
  .catch( (error) => {
    throw error
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


exports.update_whereabouts = async (req, res, next) => {

  // 1. Decode JWT to get a user ID
  // 2. Get the target user ID and check if authorized to edit
  // 3. Get the target user
  // 4. Update MongoDB
  // 5. Merge MongoDB entry in user record
  // 6. Emit

  // Warning, this contreoller can be used through wither GET or POST requests

  // User record needs to be passed further down the promise chain
  // let user_record = {}

  try {
    const jwt = get_jwt(req)

    // If no token, forbid further access
    if(!jwt) throw createHttpError(403, `JWT not found`)

    // Retrieve the user ID from the JWT
    const jwt_decoding_url = IDENTIFICATION_URL || `${AUTHENTICATION_API_URL}/user_from_jwt`
    const params = {jwt}

    const { data: jwt_owner} = await axios.get(jwt_decoding_url,{params})

    // Use the provided user ID if available. Otherwise use that of the JWT
    // Are there cases where update is for another user?

    const jwt_owner_id = get_id_of_item(jwt_owner)

    let user_id = req.params.user_id
      ?? req.query.user_id
      ?? req.body.user_id
      ?? jwt_owner_id

    if (user_id === 'self') user_id = jwt_owner_id

    if(!user_id) throw createHttpError(400, `User ID not specified`)

    const user_is_admin = jwt_owner.isAdmin || jwt_owner.properties.isAdmin


    if(String(jwt_owner_id) !== String(user_id) && !user_is_admin){
      throw createHttpError(403, `Unauthorized to modify another user`)
    }


    const url = `${EMPLOYEE_MANAGER_API_URL}/v3/users/${user_id}`

    const {data: user} = await axios.get(url, {params})


    // Retrieve the user info from the user manager

    const message = req.body.message
      || req.body.current_location
      || req.query.current_location
      || req.query.message

    const availability = req.body.availability
      || req.body.presence
      || req.query.availability
      || req.query.presence

    if(!message && !availability) throw createHttpError(400, `Message or availability not provided`)

    const filter = { user_id }

    const update = { $set: { last_update: new Date() } }
    if(message) update.message = message
    if(availability) update.availability = availability

    const update_options = { new: true, upsert: true }

    const new_whereabouts = await Whereabouts.findOneAndUpdate(filter, update, update_options)

    console.log(`[Mongoose] whereabouts of user ${user._id} updated`)

    user.whereabouts = new_whereabouts

    // JWT needed because querying goups of user to update corresponding rooms
    update_rooms_of_user(user, jwt)

    res.send(user)


  }
  catch (error) {
    next(error)
  }





}
