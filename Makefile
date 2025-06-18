-include .env
export

VERSION := $(shell cat VERSION)
# PUBLISHED is a file that contains the docker image to publish to. If it doesn't exist, use the default DOCKER_IMAGE which is an enviorment variable in CI
PUBLISHEDIMAGE := $(shell if [ -f PUBLISHED ]; then cat PUBLISHED; else echo $(DOCKER_IMAGE); fi)

build:
	docker build --build-arg "NPM_TOKEN=${NPM_TOKEN}" -t informatievlaanderen/data.vlaanderen.be-assets:${VERSION} .

build-linux:
	docker build --platform=linux/amd64 --build-arg "NPM_TOKEN=${NPM_TOKEN}" -t informatievlaanderen/data.vlaanderen.be-assets:${VERSION} .

run:
	docker run --rm -it -p 3000:3000 -d informatievlaanderen/data.vlaanderen.be-assets:${VERSION}

publish:
	docker tag informatievlaanderen/data.vlaanderen.be-assets:${VERSION} ${PUBLISHEDIMAGE}:${VERSION}
	docker push ${PUBLISHEDIMAGE}:${VERSION}
	docker tag informatievlaanderen/data.vlaanderen.be-assets:${VERSION} ${PUBLISHEDIMAGE}:latest
	docker push ${PUBLISHEDIMAGE}:latest
