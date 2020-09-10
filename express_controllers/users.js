const dotenv = require('dotenv')
const io = require('../main.js').io
const axios = require('axios')


dotenv.config()

let update_rooms_of_user = (user_record, jwt) => {
  // Sends a WS event to all members of the room (group) an updated user is part of

  let user = user_record._fields[user_record._fieldLookup.employee]

  let user_id = user.identity.low
  if(!user_id && user_id !== 0) return console.log(`User does not have an ID`)

  let url = `${process.env.GROUP_MANAGER_API_URL}/members/${user_id}/groups`
  let options = { headers: {"Authorization" : `Bearer ${jwt}`} }

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

  let jwt = req.body.jwt
    || req.body.token
    || req.query.jwt
    || req.query.token


  if(!jwt) {
    // Check if auth header is set
    if(!req.headers.authorization) {
      console.log(`JWT not found in query or body and uuthorization header not set`)
      return res.status(403).send(`JWT not found in query or body and uuthorization header not set`)
    }

    // Retrieve JWT from auth header
    jwt = req.headers.authorization.split(" ")[1]
  }


  // If no token, forbid further access
  if(!jwt) {
    console.log(`JWT not found`)
    return res.status(403).send(`JWT not found`)
  }

  // Retrieve the user ID from the JWT
  let jwt_decoding_url = `${process.env.AUTHENTICATION_API_URL}/user_from_jwt`
  axios.get(jwt_decoding_url,{params: {jwt: jwt}})
  .then( (response) => {

    // Use the provided user ID if available. Otherwise use that of the JWT
    let user_id = req.params.user_id
      || req.params.query.user_id
      || req.body.user_id
      || response.data.identity.low

    let url = `${process.env.EMPLOYEE_MANAGER_API_URL}/employees/${user_id}`
    let body = {
      current_location: req.body.current_location || req.query.current_location,
      presence: req.body.presence || req.query.presence,
    }

    console.log(`Updating user ${user_id}`)

    axios.patch(url, body, { headers: {"Authorization" : `Bearer ${jwt}`} })
    .then((response) => {
      console.log(`User ${user_id} has been Updated`)

      let record = response.data[0]
      let user = record._fields[record._fieldLookup.employee]

      // respond with the user
      res.send(user)

      // Update rooms related to user
      update_rooms_of_user(record, jwt)

    })
    .catch((error) => {
      res.status(500).send(error)
      if(error.response) console.log(error.response.data)
      else console.log(error)
    })

  })
  .catch( (error) => { res.status(403).send(error) })

}

const driver = require('../neo4j_driver.js')

exports.update_user_direct_db_access = (req, res) => {

  let jwt = req.body.jwt
    || req.body.token
    || req.query.jwt
    || req.query.token


  if(!jwt) {
    // Check if auth header is set
    if(!req.headers.authorization) {
      console.log(`JWT not found in query or body and uuthorization header not set`)
      return res.status(403).send(`JWT not found in query or body and uuthorization header not set`)
    }

    // Retrieve JWT from auth header
    jwt = req.headers.authorization.split(" ")[1]
  }


  // If no token, forbid further access
  if(!jwt) {
    console.log(`JWT not found`)
    return res.status(403).send(`JWT not found`)
  }

  // Retrieve the user ID from the JWT
  let jwt_decoding_url = `${process.env.AUTHENTICATION_API_URL}/user_from_jwt`
  axios.get(jwt_decoding_url,{params: {jwt: jwt}})
  .then( (response) => {

    // Use the provided user ID if available. Otherwise use that of the JWT
    let user_id = req.params.user_id
      || req.params.query.user_id
      || req.body.user_id
      || response.data.identity.low

    console.log(`Updating user ${user_id}`)

    let new_properties = {
      current_location: req.body.current_location || req.query.current_location,
      presence: req.body.presence || req.query.presence,
    }

    const session = driver.session()
    session
    .run(`
      // Find the employee using the ID
      MATCH (employee:Employee)
      WHERE id(employee)=toInteger($employee_id)

      // Patch properties
      // += implies update of existing properties
      SET employee += $properties

      RETURN employee
      `, {
      employee_id: employee_id,
      properties: new_properties,
    })
    .then(result => {
      let record = result.records[0]

      if(!record) res.status(500).send('No records')
      
      let user = record._fields[record._fieldLookup.employee]

      // respond with the user
      res.send(user)

      // Update rooms related to user
      update_rooms_of_user(record, jwt)
    })
    .catch(error => {
      console.error(error)
      res.status(400).send(`Error accessing DB: ${error}`)
    })
    .finally( () => { session.close() })


  })
  .catch( (error) => { res.status(403).send(error) })

}
