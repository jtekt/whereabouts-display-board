import "dotenv/config";
import { version, author } from "../package.json";

console.log(`行先掲示板 v${version}`);

import express, { Request, Response, NextFunction } from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { HttpError } from "http-errors";
import promBundle from "express-prom-bundle";

import "./mongo";
import { wsAuthMiddleware } from "./middleware/wsAuth";
import { createJwtAuthHandler } from "./middleware/jwtAuth";
import { get_whereabouts, update_whereabouts } from "./controllers/users";
import { join_groups } from "./controllers/groups";
import { getMiddlewareChain } from "./middleware/auth";

import * as mongo from "./mongo";

const {
  APP_PORT = "80",
  IDENTIFICATION_URL,
  OIDC_JWKS_URI,
  GROUP_MANAGER_API_URL = "UNDEFINED",
  EMPLOYEE_MANAGER_API_URL = "UNDEFINED",
} = process.env;

const app = express();
const http_server = http.createServer(app);

export const io = new Server(http_server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(cors());
app.use(express.json());
app.use(promBundle({ includeMethod: true, includePath: true }));

app.get("/", (_req: Request, res: Response) => {
  res.send({
    application_name: "行先掲示板",
    author,
    version,
    authentication: {
      identification_url: IDENTIFICATION_URL,
      oidc_jwks_uri: OIDC_JWKS_URI,
    },
    group_manager_api_url: GROUP_MANAGER_API_URL,
    employee_manager_api_url: EMPLOYEE_MANAGER_API_URL,
    mongodb: {
      url: mongo.redactedConnectionString,
      connected: mongo.connected(),
    },
  });
});

app.use(getMiddlewareChain());
app.route("/users/whereabouts").get(get_whereabouts);
app.route("/users/:user_id").patch(update_whereabouts).put(update_whereabouts);
app.route("/update").get(update_whereabouts); // legacy GET alias

// Express error handler — must have 4 parameters for Express to treat it as error middleware
app.use((err: HttpError, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(err.statusCode ?? 500).send(err.message);
});

// WebSocket
io.on("connection", (socket) => {
  socket.use(wsAuthMiddleware(socket, createJwtAuthHandler(socket)) as never);
  socket.on("join_groups", join_groups(socket));
});

http_server.listen(parseInt(APP_PORT, 10), () => {
  console.log(`[Express] Listening on *:${APP_PORT}`);
});

export { http_server };
