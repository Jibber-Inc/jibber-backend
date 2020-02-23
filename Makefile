.PHONY: install dev mongo schema migrate


install:
	@npm i


dev: mongo
	@npm run dev:src


mongo:
	@mongodb-runner start


schema:
	pipenv run get_schemas


migrate:
	pipenv run migrate
