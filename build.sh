#!/bin/bash

# load the configuration file
source config.sh

# list of .env files
ENV_AUTH="${ABSOLUTE_PATH}/meza-api-authentication/.env"
ENV_FILES="${ABSOLUTE_PATH}/meza-api-files/.env"
ENV_GATEKEEPER="${ABSOLUTE_PATH}/meza-api-gatekeeper/.env"
ENV_PROJECT="${ABSOLUTE_PATH}/meza-api-project/.env"
ENV_IMAGEPROCESSOR="${ABSOLUTE_PATH}/meza-imageprocessor/.env"

# install dependencies
npm install

# organize in an array
declare -a FILES=(
                    "${ENV_AUTH}"
                    "${ENV_FILES}"
                    "${ENV_GATEKEEPER}"
                    "${ENV_PROJECT}"
                    "${ENV_IMAGEPROCESSOR}"
                )

# loop through the files array
for FILE in "${FILES[@]}"
do
    # print filename
    echo "${FILE}"

    # copy .env.template to .env
    cp -n "${FILE}.template" "${FILE}"

    # set the server configuration
    sed -i.bak "s/^SERVER=.*/SERVER='${SERVER}'/g" "${FILE}"

    # set the database configuration
    sed -i.bak "s/^DB_PORT=.*/DB_PORT='${DB_PORT}'/g" "${FILE}"
    sed -i.bak "s/^DB_HOST=.*/DB_HOST='${DB_HOST}'/g" "${FILE}"
    sed -i.bak "s/^DB_NAME=.*/DB_NAME='${DB_NAME}'/g" "${FILE}"
    sed -i.bak "s/^DB_USERNAME=.*/DB_USERNAME='${DB_USERNAME}'/g" "${FILE}"
    sed -i.bak "s/^DB_PASSWORD=.*/DB_PASSWORD='${DB_PASSWORD}'/g" "${FILE}"

    # set the storage configuration
    sed -i.bak "s/^LOCAL_DIRECTORY=.*/LOCAL_DIRECTORY='${LOCAL_DIRECTORY}'/g" "${FILE}"

done
