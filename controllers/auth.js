const axios = require('axios')
const dotenv = require('dotenv')

dotenv.config()


exports.auth = (socket) => {

  return (message, callback) => {

    const jwt = message.jwt

    if(!jwt) {
      console.log(`[WS] user did not provide a JWT`)
      return callback(false, false)
    }

    const url = `${process.env.AUTHENTICATION_API_URL}/user_from_jwt`
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
