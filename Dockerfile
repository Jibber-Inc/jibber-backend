FROM node:lts

WORKDIR /code

COPY package.json .
COPY package-lock.json .
RUN npm ci 

COPY src ./src
COPY babel.config.js .
RUN npm run build

EXPOSE 1337
CMD [ "npm", "start" ]
# uncomment this line to run in dev mode.
# CMD ["sh", "-c", "npm run dev:watch"]
