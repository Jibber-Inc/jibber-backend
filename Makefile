install:
	rm -rf node_modules&&npm i

start: mongo
	npm start

mongo:
	mongodb-runner start
