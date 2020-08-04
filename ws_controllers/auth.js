const axios = require('axios')
const dotenv = require('dotenv')

dotenv.config()


exports.auth = (socket) => {

  return (message, callback) => {
    let jwt = message.jwt
    if(!jwt) return callback(false, false)
    let url = `${process.env.AUTHENTICATION_API_URL}/user_from_jwt`
    axios.get(url,{params: {jwt: jwt}})
    .then( (response) => {
      console.log(`[WS] User ${response.data.identity.low} authenticated successfully`)
      socket.jwt = jwt
      callback(false, true)
    })
    .catch( (error) => { callback(error, false) })
  }

}
