import request from "supertest"
import { expect } from "chai"
import { http_server as app } from "../src/main.js"

describe("/", () => {
  before(async () => {
    // Silencing console
    console.log = () => {}
  })

  describe("GET /", () => {
    it("Should return the application info", async () => {
      const { status } = await request(app).get(`/`)
      expect(status).to.equal(200)
    })
  })
})
