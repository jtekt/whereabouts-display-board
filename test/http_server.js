const request = require("supertest")
const {expect} = require("chai")
const {http_server: app} = require("../main.js")


describe('/', () => {


  before( async () => {
    // Silencing console
    console.log = () => {}
  })

  describe("GET /", () => {

    it("Should return the application info", async () => {
      const {status} = await request(app).get(`/`)
      expect(status).to.equal(200)
    })
  })

})
