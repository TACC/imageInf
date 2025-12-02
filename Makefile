.PHONY: build deploy start stop

TAG := $(shell git log --format=%h -1)
IMAGE=taccwma/imageinf
IMAGE_CLIENT  = taccwma/imageinf-client

build: build-service build-client


build-service:
	docker build -t $(IMAGE):$(TAG) .
	docker tag $(IMAGE):$(TAG) $(IMAGE):local

build-client:
	docker build -f Dockerfile.client -t $(IMAGE_CLIENT):$(TAG) .

deploy:
	docker push $(IMAGE):$(TAG)
	docker push $(IMAGE_CLIENT):$(TAG)

start:
	docker-compose up

setup-tapis-token:
	@echo "Getting tapis token for iframe cep.test"
	@docker run -it --rm -v $(PWD):/app taccwma/imageinf:local python /app/scripts/setup_iframe_token.py

# Run like a demo cep.test with iframe
start-iframe-cep-test-simulation:
	docker-compose -f docker-compose.iframe-cep-test-simulation.yml up

stop-iframe-cep-test-simulation:
	docker-compose -f docker-compose.iframe-cep-test-simulation.yml down

stop:
	docker-compose down
	$(MAKE) stop-iframe-cep-test-simulation
