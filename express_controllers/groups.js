const dotenv = require('dotenv')
const io = require('../main.js').io
const axios = require('axios')

dotenv.config()

exports.get_groups_of_user = (req, res) => {
  // forwarding request to group manager API
  // THIS SOULD NOT BE NECESSARY
  console.log(`IF TIS PRINTS, MAKE DIRECT ACCESS TO SERVICE`)
  const url = `${process.env.GROUP_MANAGER_API_URL}/members/${req.params.user_id}/groups`
  const options = {headers: {"Authorization" : req.headers.authorization}}
  axios.get(url, options)
  .then( (response) => { res.send(response.data) } )
  .catch( (error) => { res.status(error.response.status).send(error) })
}
