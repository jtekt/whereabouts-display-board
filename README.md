# 行先掲示板 / Whereabouts display board

A web-based display board to show the whereabouts of team members.

## API

|Route|Method|Query/body|Description|
|---|---|---|---|
|/users/USER_ID|PATCH/PUT|current_location, presence (JSON) | Updates the whereabouts of user with ID USER_ID|
|/update|GET|token, presence, current_location| Updates the whereabouts of user identified by the provided user token|