const axios = require('axios')
const dotenv = require('dotenv')

dotenv.config()

exports.login = (req,res) => {
  // Forwarding to actual auth API
  let url = `${process.env.AUTHENTICATION_API_URL}/login`
  axios.get(url, req.body)
  .then( (response) => { res.send(response.data) })
  .catch( (error) => { res.status(error.response.status).send(error) })
}

exports.whoami = (req,res) => {
  // Forwarding to actual auth API
  let url = `${process.env.AUTHENTICATION_API_URL}/whoami`
  axios.get(url, req.body)
  .then( (response) => {res.send(response.data)})
  .catch( (error) => { res.status(error.response.status).send(error) })
}
