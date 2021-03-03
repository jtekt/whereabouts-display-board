// This file isnot needed anymore, make direct API calls to appropriate service

const axios = require('axios')
const dotenv = require('dotenv')

dotenv.config()

exports.login = (req,res) => {
  // Forwarding to actual auth API
  console.log(`IF THIS PRINTS, USE AUTH SERVICE DIRECTLY`)
  const url = `${process.env.AUTHENTICATION_API_URL}/login`
  axios.get(url, req.body)
  .then( (response) => { res.send(response.data) })
  .catch( (error) => { res.status(error.response.status).send(error) })
}

exports.whoami = (req,res) => {
  // Forwarding to actual auth API
  console.log(`IF THIS PRINTS, USE AUTH SERVICE DIRECTLY`)
  const url = `${process.env.AUTHENTICATION_API_URL}/whoami`
  axios.get(url, req.body)
  .then( (response) => {res.send(response.data)})
  .catch( (error) => { res.status(error.response.status).send(error) })
}
