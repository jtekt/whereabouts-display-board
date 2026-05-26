import axios from "axios";
import { Request, Response } from "express";
import { Socket } from "socket.io";
import Whereabouts from "../models/whereabouts";
import { get_id_of_item, get_jwt } from "../utils/extractors";
import {
  UserRecord,
  GroupMembersResponse,
  GetMembersPayload,
} from "../types/whereabouts";
import createHttpError from "http-errors";

const { GROUP_MANAGER_API_URL } = process.env;

/**
 * Leaves all non-system rooms and joins the specified group room.
 * Uses for...of because socket.rooms is a Set in Socket.IO v4.
 */
function manage_rooms(socket: Socket, group_id: string): void {
  for (const room of socket.rooms) {
    if (room !== socket.id && room !== "authenticated") {
      console.log(`[WS] Socket ${socket.id} left room ${room}`);
      socket.leave(room);
    }
  }
  socket.join(group_id);
  console.log(`[WS] Socket ${socket.id} has joined room ${group_id}`);
}

/**
 * Returns a handler for the "get_members_of_group" WebSocket event.
 * Fetches group members, attaches their whereabouts, and emits the result.
 */
export function get_members_of_group(socket: Socket) {
  return (message: GetMembersPayload): void => {
    const group_id = message.group_id;
    if (!group_id) {
      console.log("[WS] Missing group ID");
      return;
    }

    const url = `${GROUP_MANAGER_API_URL}/v3/groups/${group_id}/members`;
    const params = { batch_size: -1 };
    const headers = { Authorization: `Bearer ${socket.jwt}` };

    let users: UserRecord[] = [];

    axios
      .get<GroupMembersResponse>(url, { headers, params })
      .then(({ data }) => {
        users = data.items;

        if (!users.length) return [];

        manage_rooms(socket, group_id);

        const query = { $or: users.map(({ _id }) => ({ user_id: _id })) };
        return Whereabouts.find(query);
      })
      .then((entries) => {
        if (!entries) return;

        const entriesMap: Record<string, unknown> = {};
        entries.forEach((entry) => {
          entriesMap[entry.user_id] = entry;
        });

        users.forEach((user) => {
          const user_id = get_id_of_item(user as Record<string, unknown>);
          const entry = entriesMap[String(user_id)] as
            | typeof user.whereabouts
            | undefined;
          user.whereabouts = entry ?? {
            user_id: String(user_id),
            availability: "absent",
            message: "unknown",
          };
        });

        socket.emit("members_of_group", users);
      })
      .catch((error: unknown) => {
        const message =
          (error as { response?: { data: unknown } }).response?.data ?? error;
        socket.emit("error_message", message);
        console.error(message);
      });
  };
}

export async function get_group_members_whereabouts(
  req: Request,
  res: Response,
) {
  const jwt = get_jwt(req);
  if (!jwt) {
    throw createHttpError(401, "Missing Authorization header");
  }

  const group_id = req.params.group_id;
  const limit = Number(req.query.limit) || 25;
  const skip = Number(req.query.skip) || 0;

  if (!group_id) {
    throw createHttpError(400, "Group ID is required");
  }

  let users = [];
  let total_of_users = 0;

  try {
    const url = `${GROUP_MANAGER_API_URL}/v3/groups/${group_id}/members`;
    const headers = { authorization: `Bearer ${jwt}` };
    const params = {
      batch_size: limit,
      start_index: skip,
    };

    const { data } = await axios.get(url, { headers, params });
    const { items, count } = data;

    users = items;
    total_of_users = count;
  } catch (error: any) {
    const { response = {} } = error;
    const { status = 500, data = "Failed to query workplace members" } =
      response;
    throw createHttpError(status, data);
  }

  try {
    if (users.length > 0) {
      const query = {
        $or: users.map((user: { _id: string }) => ({ user_id: user._id })),
      };
      const entries = await Whereabouts.find(query);

      const entriesMap: Record<string, any> = {};

      for (const entry of entries) {
        entriesMap[entry.user_id] = entry;
      }

      for (const user of users) {
        const user_id = String(user);
        const entry = entriesMap[user_id];

        user.whereabouts = entry || {
          user_id,
          availability: "absent",
          message: "unknown",
        };
      }
    }

    const result = {
      users,
      limit,
      skip,
      total: total_of_users,
    };

    return res.send(result);
  } catch (error) {
    throw createHttpError(500, "Failed to query whereabouts");
  }
}
