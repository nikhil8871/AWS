# Application Tier (Backend API)

The **Application Tier** is a robust, lightweight RESTful API built with **Node.js** and **Express.js**. It serves as the business logic and database access layer in this 3-tier AWS architecture, securely deployed in a **Private Subnet** with no public internet exposure.

---

## 🏗️ Architecture Role

* **Private Subnet Deployment:** Sits in a private VPC subnet (`10.0.3.0/24`) behind an **Internal Application Load Balancer**.
* **Zero Public Ingress:** Inaccessible directly from the public internet. Only accepts incoming HTTP requests on port `4000` from the Internal Load Balancer Security Group.
* **Database Connection:** Connects to **AWS RDS Aurora MySQL** on port `3306` across the VPC database subnet.
* **Process Management:** Daemonized via **PM2** with automatic restart on crash and `systemd` persistence across EC2 reboots.

---

## 📡 REST API Endpoints

| Method | Endpoint | Description | Response Example |
| :--- | :--- | :--- | :--- |
| **GET** | `/health` | Health check endpoint for ALB target group | `"This is the health check"` |
| **GET** | `/transaction` | Retrieves all transactions from Aurora DB | `{"result":[{"id":1,"amount":400,"description":"groceries"}]}` |
| **POST** | `/transaction` | Inserts a new transaction into Aurora DB | `{"message":"added transaction successfully"}` |
| **DELETE**| `/transaction` | Truncates/deletes all transaction records | `{"message":"delete function execution finished."}` |

---

## ⚙️ Configuration & Environment Variables

Database credentials and runtime configuration are managed via environment variables in `DbConfig.js`:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `DB_HOST` | `mysql-db.ch8sokem81lg.ap-south-2.rds.amazonaws.com` | RDS Aurora MySQL cluster endpoint |
| `DB_USER` | `admin` | Database username |
| `DB_PWD` | `123456789` | Database master password |
| `DB_NAME` | `webappdb` | Target database containing `transactions` |
| `PORT` | `4000` | Express HTTP server listening port |

---

## 🚀 Running Locally or on EC2

### Install Dependencies:
```bash
npm install
```

### Start with Node:
```bash
DB_HOST="<RDS_ENDPOINT>" DB_USER="admin" DB_PWD="<PASSWORD>" DB_NAME="webappdb" PORT=4000 node index.js
```

### Start with PM2 (Production Daemon):
```bash
sudo -u ec2-user \
    DB_HOST="<RDS_ENDPOINT>" \
    DB_USER="admin" \
    DB_PWD="<PASSWORD>" \
    DB_NAME="webappdb" \
    PORT=4000 \
    pm2 start index.js --name "backend"

# Save process list for systemd boot persistence
sudo -u ec2-user pm2 save
```
