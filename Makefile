install:
	\
	npm i


start: mongo
	\
	npm start

mongo:
	\
	mongodb-runner start
