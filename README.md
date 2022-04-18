# 行先掲示板 / Whereabouts display board

A lot of Japanese companies use a whiteboards to display the whereabouts of team members. 
Those can be useful when quickly trying to figure out if a member is in the office, on a business trip, etc.

<p align="center">
  <img width="300" src="./docs/whiteboard.jpg">
</p>

However, because of COVID-19, more and more employees work from home and can thus not see the whiteboards anymore.
This application offers a solution to the problem by providing the same features but as a web application.
Here, the whereabouts of team members are displayed on a single page application (SPA) and can be easily edited from any device.
The wherebouts are stored in a MongoDB database and their changes are broadcast via WebSockets to all connected clients for real-time updates.

## API

|Route|Method|Query/body|Description|
|---|---|---|---|
|/users/USER_ID|PATCH/PUT|current_location, presence (JSON) | Updates the whereabouts of user with ID USER_ID|
|/update|GET|token, presence, current_location| Updates the whereabouts of user identified by the provided user token|