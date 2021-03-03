/*
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



    let new_properties = {
      current_location: req.body.current_location || req.query.current_location,
      presence: req.body.presence || req.query.presence,
    }

    console.log(`Updating user ${user_id} with direct DB access`)

    const session = driver.session()
    session.run(`
      // Find the employee using the ID
      MATCH (employee:Employee)
      WHERE id(employee)=toInteger($employee_id)

      // Patch properties
      // += implies update of existing properties
      SET employee += $properties

      RETURN employee
      `, {
      employee_id: user_id,
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
*/
