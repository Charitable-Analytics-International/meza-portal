# CAI Meza - API - Files

This module is responsible for file upload and download to and from the storage.

It runs on port 8083. 

## Mise-en-place

Here are the instructions to setup your Meza server

1. Clone this repo on your ubuntu 20.04 server

2. Create copies of the following files

        cp .env.template .env

3. Set your postgresql, and storage information in the [.env](./.env) file

4. Make sure everything is working by running,

        npm start


## Additional Configurations

You might want to look at the following [file](./.platform/nginx/conf.d/proxy.conf) for more advanced configuration.


## Author

* **Jean-Romain Roy** - *Principal Developer* - [jeanromainroy](https://github.com/jeanromainroy)
