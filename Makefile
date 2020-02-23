.PHONY: install dev mongo schemas


install:
	@npm i


dev: mongo
	@npm run dev:src


mongo:
	@mongodb-runner start


schema:
	pipenv run get_schemas
