const axios = require("axios")
const dotenv = require("dotenv")

dotenv.config()

const { AUTHENTICATION_API_URL, IDENTIFICATION_URL } = process.env

const url = IDENTIFICATION_URL || `${AUTHENTICATION_API_URL}/user_from_jwt`

exports.auth = (socket) => {
  return (message, callback) => {
    const { jwt } = message

    if (!jwt) {
      console.log(`[WS] user did not provide a JWT`)
      return callback(false, false)
    }

    axios
      .get(url, { params: { jwt } })
      .then((response) => {
        socket.jwt = jwt
        callback(false, true)
      })
      .catch((error) => {
        console.log(`Error retrieving user data from JWT`)
        console.log(error)
        callback(error, false)
      })
  }
}
