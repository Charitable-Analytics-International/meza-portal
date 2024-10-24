# CAI Meza - Server - Gatekeeper Module

This module is responsible for authorizing & proxying requests to the appropriate module. This module sits in front of all the other. 

It runs on port 8080. 


## Mise-en-place

Here are the instructions to setup your Meza server

1. Clone this repo on your ubuntu 20.04 server

2. Create copies of the following files

        cp .env.template .env

3. Set your postgresql, and session id information in the [.env](./.env) file

4. Make sure everything is working by running,

        npm start


## Additional Configuration

If you want the session id of accounts with access 4 to never expire, set the [.env](./.env) file as follow, 

        SID_NO_EXPIRATION_FOR_ACCESS_4=1

## In Development

- No putting the account_id in the response headers


## Author

* **Jean-Romain Roy** - *Principal Developer* - [jeanromainroy](https://github.com/jeanromainroy)
