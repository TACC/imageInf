.PHONY: build start test lint

build:
	docker-compose build

start:
	docker-compose up

stop:
	docker-compose down
