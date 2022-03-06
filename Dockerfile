FROM node:lts

WORKDIR /code

# ################################################ #
# Uncomment all commented lines to run in dev mode
# and comment:
# - RUN npm ci
# - RUN npm run build
# - CMD ["npm", "start"]
# ################################################ #

COPY package.json .
COPY package-lock.json .
# RUN npm ci
# RUN npm install

COPY src ./src
COPY babel.config.js .
# RUN npm run build

EXPOSE 1337
# CMD [ "npm", "start" ]
CMD ["sh", "-c", "npm run dev:watch"]
