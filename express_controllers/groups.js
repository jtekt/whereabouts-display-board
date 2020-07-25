const dotenv = require('dotenv')
const io = require('../main.js').io
const axios = require('axios')

dotenv.config()

exports.get_groups_of_user = (req, res) => {

  // Forwarding request to group manager API

  let url = `${process.env.GROUP_MANAGER_API_URL}/members/${req.params.user_id}/groups`

  axios.get(url, {headers: {"Authorization" : req.headers.authorization}})
  .then( (response) => { res.send(response.data) } )
  .catch( (error) => { res.status(error.response.status).send(error) })

}
