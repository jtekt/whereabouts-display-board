const axios = require('axios')
const dotenv = require('dotenv')

dotenv.config()

const {
  AUTHENTICATION_API_URL,
  IDENTIFICATION_URL,
} = process.env

exports.auth = (socket) => {

  return (message, callback) => {

    const {jwt} = message

    if(!jwt) {
      console.log(`[WS] user did not provide a JWT`)
      return callback(false, false)
    }

    const url = IDENTIFICATION_URL || `${AUTHENTICATION_API_URL}/user_from_jwt`

    axios.get(url,{params: {jwt}})
    .then( (response) => {
      console.log(`[WS] User authenticated successfully`)
      socket.jwt = jwt
      callback(false, true)
    })
    .catch( (error) => {
      console.log(`Error retrieving user data from JWT`)
      console.log(error)
      callback(error, false)
    })
  }

}
