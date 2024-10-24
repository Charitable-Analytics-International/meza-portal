# CAI Meza - Portal

CAI Meza is a software solution designed to digitize hand-filled paper logbooks.

## Overview: Image Processing Lifecycle

1. Users capture logbook page photos using the CAI Meza mobile app.

2. Once in an area with connectivity, the app uploads the images to the CAI Meza API.

3. The API forwards images to the Image Processing Service.

4. Tables are detected, matched to templates, and cells are extracted.

5. Cells are decoded based on their expected data types (e.g., numbers, checkboxes) with confidence scores.

6. Results are returned and stored in the project database.


## 1. Install Dependencies

Start by installing the required software and libraries on your Ubuntu 20.04 server.

### System Packages

Install PostgreSQL, Node.js, and NGINX.
- [PostgreSQL Installation Guide](https://www.digitalocean.com/community/tutorials/how-to-install-postgresql-on-ubuntu-20-04-quickstart)
- [Node.js Installation Guide](https://github.com/nodesource/distributions/blob/master/README.md)
- [NGINX Installation Guide](https://www.digitalocean.com/community/tutorials/how-to-install-nginx-on-ubuntu-20-04)

Then, install additional required packages:
```bash
sudo apt install libpq-dev python3-dev python3-pip
```

### Python Libraries

Install Python libraries for image processing and data handling:
```bash
pip3 install psycopg2 notebook opencv-python-headless matplotlib pandas scikit-learn
```

## 2. Clone the CAI Meza Repository

Clone the CAI Meza repository to your Ubuntu server:

```bash
git clone https://github.com/Charitable-Analytics-International/meza-portal
```

## 3. Configure the Application

Update the necessary configuration files to match your setup.
Here’s the revised version for the API configuration:

### API Configuration

1. Rename the `config.sh.template` file to `config.sh`:
   ```bash
   mv config.sh.template config.sh
   ```
2. Open the newly renamed `config.sh` file:
   ```bash
   nano config.sh
   ```
3. Add your database credentials, storage information to the appropriate fields in the file.


### Web Application Configuration

1. Open the [config.js](./meza-webapp/src/config.js) file.
2. Set your `DEFAULT_SERVER` value to point to the appropriate server.

## 4. Build the Project

Run the build script to set up all necessary submodules:

```bash
./build.sh
```

(do not npm audit fix)

## 5. Start the Application

To launch the CAI Meza API, run:

```bash
./start.sh
```

## 6. NGINX Configuration

NGINX needs to be set up as a reverse proxy to handle HTTP/HTTPS requests and forward them to your Node.js application running on port 8080.

### Reverse Proxy Setup

1. Install Certbot to handle SSL certificates.
2. Configure NGINX as a reverse proxy:

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    location / {
        proxy_http_version 1.1;
        proxy_cache_bypass $http_upgrade;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_pass http://localhost:8080;
    }
}
```

### Allow Large File Uploads

Modify `/etc/nginx/nginx.conf` to increase the maximum upload size:

```nginx
http {
    client_max_body_size 200m;
}
```

## 7. Auto-Start on Boot

To ensure that the CAI Meza API automatically starts when the server boots, add a cron job:

1. Open the crontab editor:

```bash
crontab -e
```

2. Add the following line, replacing `/ABSOLUTE/PATH/TO/start.sh` with the correct path to your start script:

```bash
@reboot /ABSOLUTE/PATH/TO/start.sh
```

You’ve now completed the setup for the CAI Meza API.
