const dotenv = require('dotenv')
const io = require('../main.js').io
const axios = require('axios')

dotenv.config()


exports.login = (req,res) => {
  res.send('Not implemented')
  let url = `${process.env.AUTHENTICATION_API_URL}/login`

}
