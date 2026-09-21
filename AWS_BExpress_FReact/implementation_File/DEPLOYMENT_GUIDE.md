# AWS 3-Tier Architecture Manual Deployment Guide

This guide provides the exact **command-by-command manual deployment procedure** for deploying your 3-tier architecture:
- **Tier 1 (Web Tier):** Frontend React App + Nginx Reverse Proxy (Public Subnet / Bastion)
- **Tier 2 (App Tier):** Backend Node.js Express API (Private Subnet + NAT Gateway)
- **Tier 3 (Database Tier):** AWS Aurora MySQL Cluster (Private DB Subnet)

---

## Why We Setup Manually via Jump-Box Workflow

1. **Avoid 502 Bad Gateway:** If Nginx starts before Backend and Aurora are running, all requests fail with `502 Bad Gateway`.
2. **Dynamic Backend Private IP:** The Frontend Nginx reverse proxy needs the Backend EC2's **Private IP**, which is only known after launching Backend EC2.
3. **Frontend Acts as Bastion:** The Frontend EC2 sits in the Public Subnet and serves as your secure jump-box to access the private Backend EC2 and Aurora MySQL.
4. **Learning & Visibility:** Running each command individually lets you see exactly how Linux, Node.js, PM2, and Nginx interact with AWS.

---

## Deployment Workflow Overview

```
[ Your Local Machine ]
         │
         │ 1. SSH (Port 22)
         ▼
┌───────────────────────────────────────────────┐
│ Frontend EC2 (Public Subnet)                  │
│ • Public IP assigned                          │
│ • Acts as Bastion / Jump-Box                  │
│ • (Do not configure Nginx yet!)               │
└───────────────────────┬───────────────────────┘
                        │
                        │ 2. SSH (Port 22 via Private Subnet)
                        ▼
┌───────────────────────────────────────────────┐
│ Backend EC2 (Private Subnet + NAT Gateway)    │
│ • Outbound internet via NAT Gateway           │
│ • 3. Initialize Aurora MySQL first            │
│ • 4. Configure Backend commands (Port 4000)   │
│ • Note Backend Private IP                     │
└───────────────────────┬───────────────────────┘
                        │
                        │ MySQL Protocol (Port 3306)
                        ▼
┌───────────────────────────────────────────────┐
│ Aurora MySQL Cluster (Private DB Subnet)      │
│ • Table: transactions created & seeded        │
└───────────────────────────────────────────────┘
                        │
    5. Exit back to Frontend EC2
    6. Configure Frontend Nginx commands with Backend Private IP:4000
    7. Open browser at http://<FRONTEND_PUBLIC_IP>/#/db
```

---

## 1. Security Group Configuration

Verify the following inbound rules before launching instances:

| Security Group | Inbound Port | Protocol | Source | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Web Tier SG** | `22` | TCP | `Your IP` (or `0.0.0.0/0`) | SSH access from your computer |
| **Web Tier SG** | `80` | TCP | `0.0.0.0/0` | Public HTTP traffic to React app |
| **App Tier SG** | `22` | TCP | `Web Tier SG` | SSH jump from Frontend EC2 |
| **App Tier SG** | `4000` | TCP | `Web Tier SG` | Backend API traffic from Frontend Nginx |
| **Aurora DB SG** | `3306` | TCP | `App Tier SG` | Database queries from Backend |

---

## 2. Step 1: Launch Both EC2 Instances (Plain / No User Data)

1. **Launch Frontend EC2:**
   - **Name:** `Web-Tier-Frontend`
   - **AMI:** Amazon Linux 2023
   - **Subnet:** Select **Public Subnet**
   - **Auto-assign Public IP:** **Enable**
   - **Security Group:** `Web Tier SG`
   - **User Data:** **Leave Blank**
   - Note down: **Frontend Public IP**

2. **Launch Backend EC2:**
   - **Name:** `App-Tier-Backend`
   - **AMI:** Amazon Linux 2023
   - **Subnet:** Select **Private Subnet** (with route to NAT Gateway)
   - **Auto-assign Public IP:** **Disable**
   - **Security Group:** `App Tier SG`
   - **User Data:** **Leave Blank**
   - Note down: **Backend Private IP** (e.g. `10.0.2.145`)

---

## 3. Step 2: SSH Jump from Laptop ➔ Frontend ➔ Backend

You do **NOT** need any SSH Agent service. Simply use your `aws-project.pem` key:

### 1. From your Laptop ➔ Connect to Frontend EC2:
```bash
ssh -i aws-project.pem ec2-user@<FRONTEND_PUBLIC_IP>
```

### 2. From Frontend EC2 ➔ Connect to Backend EC2:
Inside your **Frontend EC2** terminal:
```bash
nano aws-project.pem
# (Paste the contents of your aws-project.pem file, save with Ctrl+O, Enter, Ctrl+X)

chmod 400 aws-project.pem
```

Now connect straight to the Backend EC2:
```bash
ssh -i aws-project.pem ec2-user@<BACKEND_PRIVATE_IP>
```
*(You are now securely inside the Backend EC2 terminal!)*

---

## 4. Step 3: On Backend EC2 ➔ Initialize Aurora MySQL

Inside your **Backend EC2** terminal:

### 1. Install MariaDB client:
```bash
sudo dnf install -y mariadb105
```

> [!NOTE]
> **Why `mariadb105` instead of `mysql`?**  
> Amazon Linux 2023 does not include the Oracle `mysql` package in its default repositories. MariaDB is an exact open-source drop-in replacement that uses the same MySQL wire protocol and port (`3306`). Installing `mariadb105` is the official AWS method to connect to Aurora MySQL without configuring external third-party repositories. Your database remains 100% genuine AWS Aurora MySQL.

### 2. Connect to Aurora MySQL:
```bash
mariadb -h <YOUR_AURORA_CLUSTER_ENDPOINT> -u admin -p
```
*(Enter your Aurora password `123456789` when prompted)*

### 3. Run the SQL schema and seed data:
Inside the MySQL prompt (`MariaDB [(none)]>`):
```sql
CREATE DATABASE IF NOT EXISTS webappdb;
USE webappdb;

CREATE TABLE IF NOT EXISTS transactions (
    id INT NOT NULL AUTO_INCREMENT,
    amount DECIMAL(10,2) NOT NULL,
    description VARCHAR(100) NOT NULL,
    PRIMARY KEY(id)
);

INSERT INTO transactions (amount, description) VALUES
    (400.00, 'groceries'),
    (150.50, 'utilities'),
    (75.00, 'restaurant');

SELECT * FROM transactions;
```

### Checkpoint: Verify Database & Seed Data
Before exiting MySQL, verify everything is created:

1. **Verify Database:**
   ```sql
   SHOW DATABASES;
   ```
   *(Verify `webappdb` appears in the list)*.

2. **Verify Table:**
   ```sql
   USE webappdb;
   SHOW TABLES;
   ```
   *(Verify `transactions` appears in the list)*.

3. **Verify Data Rows:**
   ```sql
   SELECT * FROM transactions;
   ```
   **Expected Output:**
   ```text
   +----+--------+-------------+
   | id | amount | description |
   +----+--------+-------------+
   |  1 | 400.00 | groceries   |
   |  2 | 150.50 | utilities   |
   |  3 |  75.00 | restaurant  |
   +----+--------+-------------+
   3 rows in set (0.00 sec)
   ```

4. **Exit the MySQL prompt back to Linux terminal:**
   ```sql
   EXIT;
   ```

---

## 5. Step 4: On Backend EC2 ➔ Configure Backend Application (Command-by-Command)

Still inside your **Backend EC2** terminal, run these commands one-by-one:

### 1. Update system packages & install Git:
```bash
sudo dnf update -y
sudo dnf install -y git
```
*(Note: Git is required on EC2 to clone and download your application source code from GitHub).*

### 2. Install Node.js 20 & PM2:
```bash
# Add NodeSource repository for Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -

# Install Node.js 20
sudo dnf install -y nodejs

# Verify installation
node -v
npm -v

# Install PM2 process manager globally
sudo npm install -g pm2
```

> [!NOTE]
> **What does `curl -fsSL ... | sudo bash -` do?**  
> It registers the official NodeSource repository on Amazon Linux 2023 so `dnf install -y nodejs` installs Node.js version 20.  
> - **`-f`** (Fail silently): Fails immediately on HTTP errors so error pages are not piped into bash.  
> - **`-s`** (Silent): Hides progress meter to keep output clean.  
> - **`-S`** (Show error): Displays error message if connection fails.  
> - **`-L`** (Location): Follows URL redirects automatically.  
> - **`|`** (Pipe): Passes the downloaded script directly into the next command without saving a temporary file to disk.  
> - **`sudo bash -`**: Runs the **`bash`** shell interpreter with root (`sudo`) privileges. The trailing dash (**`-`**) tells bash to read and execute the script directly from standard input (the pipe).

### 3. Clone repository and install dependencies:
```bash
cd /home/ec2-user
git clone https://github.com/Kiran191998/Terraform_Project_20_Aug_BExpress_FReact.git app

cd /home/ec2-user/app/app-tier-back
npm install

# Ensure ec2-user owns all application files
sudo chown -R ec2-user:ec2-user /home/ec2-user/app
```

### 4. Start the Express Backend with PM2:
Replace `<YOUR_AURORA_CLUSTER_ENDPOINT>` and `<YOUR_AURORA_PASSWORD>` with your actual values:
```bash
sudo -u ec2-user \
    DB_HOST="<YOUR_AURORA_CLUSTER_ENDPOINT>" \
    DB_USER="admin" \
    DB_PWD="<YOUR_AURORA_PASSWORD>" \
    DB_NAME="webappdb" \
    PORT=4000 \
    pm2 start index.js --name "backend"
```

### 5. Enable PM2 persistence across server reboots:
```bash
sudo -u ec2-user pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ec2-user --hp /home/ec2-user
sudo systemctl enable pm2-ec2-user
```

### Checkpoint: Verify Backend & Database Connection
```bash
# 1. Check PM2 status (should show 'online')
sudo -u ec2-user pm2 status

# 2. Test local Express health check
curl http://localhost:4000/health
# Expected Output: "This is the health check"

# 3. Test transaction query directly to Aurora MySQL
curl http://localhost:4000/transaction
# Expected Output: JSON array containing groceries, utilities, restaurant!

# 4. Copy the Backend Private IP address (REQUIRED FOR FRONTEND STEP)
hostname -I | awk '{print $1}'
# (Example: 10.0.2.145)

# 5. Exit back to the Frontend EC2 terminal:
exit
```

---

## 6. Step 5: On Frontend EC2 ➔ Configure Frontend Application (Command-by-Command)

Now you are **back in the Frontend EC2 terminal**. Run these commands one-by-one:

### 1. Update system packages and install Nginx, Git, and Node.js 20:
```bash
sudo dnf update -y
sudo dnf install -y nginx git

# Install Node.js 20 (needed to compile the React build)
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs
```

### 2. Clone repository and build React App:
```bash
cd /home/ec2-user
git clone https://github.com/Kiran191998/Terraform_Project_20_Aug_BExpress_FReact.git app

cd /home/ec2-user/app/web-tier-Front
npm install
npm run build
```

### 3. Deploy React build artifacts to Nginx web root:
```bash
sudo mkdir -p /var/www/html
sudo rm -rf /var/www/html/*
sudo cp -r build/* /var/www/html/
sudo chown -R nginx:nginx /var/www/html
sudo chmod -R 755 /var/www/html
```

### 4. Configure Nginx with Reverse Proxy to Backend EC2:
Run this command, replacing `<BACKEND_PRIVATE_IP>` with the private IP you copied from Step 4 (e.g. `10.0.2.145:4000`):

```bash
sudo bash -c "cat << 'EOF' > /etc/nginx/nginx.conf
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include             /etc/nginx/mime.types;
    default_type        application/octet-stream;
    sendfile            on;
    tcp_nopush          on;
    tcp_nodelay         on;
    keepalive_timeout   65;
    types_hash_max_size 4096;

    server {
        listen       80 default_server;
        listen       [::]:80 default_server;
        server_name  _;

        # Web Tier Health Check
        location /health {
            default_type text/html;
            return 200 \"<!DOCTYPE html><p>Web Tier Health Check OK</p>\\n\";
        }

        # React Frontend Single Page App routing
        location / {
            root    /var/www/html;
            index   index.html index.htm;
            try_files \$uri /index.html;
        }

        # Reverse Proxy to Backend Express API
        location /api/ {
            proxy_pass http://<BACKEND_PRIVATE_IP>:4000/;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
    }
}
EOF"
```

### 5. Start and enable Nginx:
```bash
sudo systemctl enable nginx
sudo systemctl restart nginx
```

### Checkpoint: Verify Frontend & Proxy locally
```bash
# 1. Test Nginx service status (active / running)
sudo systemctl status nginx

# 2. Test local Web Tier Health Check
curl http://localhost/health
# Expected Output: Web Tier Health Check OK

# 3. Test reverse proxy through Nginx to Backend API
curl http://localhost/api/health
# Expected Output: "This is the health check"

# 4. Test reverse proxy through Nginx to Aurora MySQL
curl http://localhost/api/transaction
# Expected Output: JSON array of transactions!
```

---

## 7. Step 6: Test from Your Web Browser

Open your web browser from your local machine and go to:
```
http://<FRONTEND_PUBLIC_IP>/#/db
```

### Verification Checklist:
- [x] React single-page app loads with the title **"Aurora Database Demo Page"**.
- [x] The table immediately displays the initial seeded rows (`groceries`, `utilities`, `restaurant`).
- [x] Test adding a new record: type `50` in Amount, `books` in Desc, and click **ADD**. The new row appears in the table.
- [x] Test deleting a record: click **DEL** and verify the database deletes the records.

---

## 8. Troubleshooting Commands

### On Backend EC2:
```bash
# Check PM2 process status & live logs
sudo -u ec2-user pm2 status
sudo -u ec2-user pm2 logs backend

# Test direct local backend API
curl http://localhost:4000/health
curl http://localhost:4000/transaction

# Test connection to Aurora MySQL directly
mariadb -h <YOUR_AURORA_ENDPOINT> -u admin -p -e "SHOW DATABASES;"
```

### On Frontend EC2:
```bash
# Check Nginx status & logs
sudo systemctl status nginx
sudo tail -n 50 /var/log/nginx/error.log

# Test reverse proxy connection to backend
curl -v http://localhost/api/health
```
