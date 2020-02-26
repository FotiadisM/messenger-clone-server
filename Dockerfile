FROM node:10-alpine as builder

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

RUN apk --no-cache add python make g++

COPY package*.json ./

RUN npm install --only=production

FROM node:10-alpine

WORKDIR /usr/src/app

COPY --from=builder node_modules node_modules

COPY . .

CMD [ "npm", "run", "start:prod" ]