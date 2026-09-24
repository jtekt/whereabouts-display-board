FROM node:24-slim

WORKDIR /usr/src/app

ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION

COPY . .

RUN npm install
RUN npm run build      
       
EXPOSE 80

CMD ["node", "dist/main.js"]
