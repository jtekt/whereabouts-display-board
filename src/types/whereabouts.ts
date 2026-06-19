/** Whereabouts record as stored in MongoDB */
export interface WhereaboutsData {
  user_id: string;
  availability?: string;
  message?: string;
  last_update?: Date;
}

/** User record returned by the employee manager API */
export interface UserRecord {
  _id: string;
  isAdmin?: boolean;
  whereabouts?: WhereaboutsData;
  [key: string]: unknown;
}

/** Group record returned by the group manager API */
export interface GroupRecord {
  _id: string;
  [key: string]: unknown;
}

/** Payload sent by the client on the "authentication" WebSocket event */
export interface WsAuthPayload {
  jwt?: string;
  token?: string;
}

/** Payload sent by the client on the "get_members_of_group" WebSocket event */
export interface GetMembersPayload {
  group_id?: string;
}

/** Shape of the group manager /members response */
export interface GroupMembersResponse {
  items: UserRecord[];
}

/** Shape of the group manager /groups response */
export interface UserGroupsResponse {
  items: GroupRecord[];
}

/** Incremental whereabouts update emitted as "whereabouts_updated" to group rooms */
export interface WhereaboutsUpdate {
  user_id: string;
  availability?: string;
  message?: string;
  last_update: string;
}
