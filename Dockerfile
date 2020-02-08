FROM mhart/alpine-node:12.14

ADD src ./code
WORKDIR /code

COPY package.json .
COPY package-lock.json .
COPY babel.config.js .

RUN npm i

EXPOSE 1337
CMD [ "npm", "start" ]
