<div align="center">

# ☁️ Production AWS 3-Tier Web Application Architecture
### Highly Available, Scalable, and Secure Enterprise Cloud Infrastructure

[![AWS](https://img.shields.io/badge/AWS-Cloud-orange?logo=amazon-aws&logoColor=white)](https://aws.amazon.com/)
[![Route 53](https://img.shields.io/badge/Route%2053-DNS-blue?logo=amazon-route53&logoColor=white)](https://aws.amazon.com/route53/)
[![ALB](https://img.shields.io/badge/Elastic%20Load%20Balancing-ALB-8C4FFF?logo=amazon-aws&logoColor=white)](https://aws.amazon.com/elasticloadbalancing/)
[![EC2](https://img.shields.io/badge/Amazon%20EC2-Compute-FF9900?logo=amazon-ec2&logoColor=white)](https://aws.amazon.com/ec2/)
[![RDS Aurora](https://img.shields.io/badge/Amazon%20RDS-Aurora%20MySQL-336791?logo=mysql&logoColor=white)](https://aws.amazon.com/rds/aurora/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Nginx](https://img.shields.io/badge/Nginx-Reverse%20Proxy-009639?logo=nginx&logoColor=white)](https://nginx.org/)
[![PM2](https://img.shields.io/badge/PM2-Process%20Manager-2B037A?logo=pm2&logoColor=white)](https://pm2.keymetrics.io/)

<br />

**Live Custom Domain:** [http://nkhlsjbpnit.shop/#/db](http://nkhlsjbpnit.shop/#/db)

</div>

---

## 📌 Executive Summary

This project demonstrates a production-ready, enterprise-grade **3-Tier Cloud Architecture** deployed on **Amazon Web Services (AWS)**. It follows AWS Well-Architected Framework best practices, featuring complete network isolation, multi-AZ high availability, dual Application Load Balancers, custom DNS routing with Route 53, and strict security group chaining based on the principle of least privilege.

---

## 📐 Architecture Diagram

```
                              [ Users & Public Internet ]
                                           │
                                           ▼  (Custom Domain: http://nkhlsjbpnit.shop)
                              ┌─────────────────────────┐
                              │    AWS Route 53 DNS     │  (Alias 'A' Record)
                              └────────────┬────────────┘
                                           │
                                           ▼  (HTTP Port 80)
      ┌─────────────────────────────────────────────────────────────────────────┐
      │         External Application Load Balancer (Internet-Facing)            │
      │ • Deployed across Multi-AZ Public Subnets (ap-south-2a & ap-south-2b)   │
      │ • Health Check Path: /health ──> Target Group: external-lb (Port 80)    │
      └────────────────────────────────────┬────────────────────────────────────┘
                                           │
                                           ▼  (HTTP Port 80)
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TIER 1: PRESENTATION LAYER (Web Tier)                                                  │
│ • Subnet: Public Subnet (10.0.1.0/24)                                                  │
│ • Instance: Web-Tier-Frontend (Amazon Linux 2023)                                      │
│ • Nginx Web Server: Serves React SPA build artifacts from /var/www/html                 │
│ • Reverse Proxy: Intercepts '/api/*' and forwards to Internal ALB DNS:80               │
│ • Bastion / Jump-Box: Secure SSH entry point into private subnet                       │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                                           ▼  (HTTP Port 80)
      ┌─────────────────────────────────────────────────────────────────────────┐
      │            Internal Application Load Balancer (Private VPC)             │
      │ • Scheme: Internal (Strictly private, zero public IP exposure)          │
      │ • Deployed across Multi-AZ Private Subnets (ap-south-2a & ap-south-2b)  │
      │ • Listener: HTTP Port 80 ──> Target Group: internal-lb (Port 4000)      │
      └────────────────────────────────────┬────────────────────────────────────┘
                                           │
                                           ▼  (Port 4000)
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TIER 2: APPLICATION LOGIC LAYER (App Tier)                                             │
│ • Subnet: Private Subnet (10.0.3.0/24) + Route to NAT Gateway for outbound updates     │
│ • Instance: App-Tier-Backend (Amazon Linux 2023)                                       │
│ • Runtime: Node.js 20 REST API (Express.js) listening on port 4000                     │
│ • Daemon: PM2 Process Manager with auto-restart and systemd persistence across reboots │
│ • Security: Inbound port 4000 strictly restricted to Internal-LB Security Group        │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                                           ▼  (MySQL Port 3306)
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TIER 3: DATABASE LAYER (Data Tier)                                                     │
│ • Subnet: Isolated DB Private Subnet (10.0.5.0/24)                                     │
│ • Cluster: AWS RDS Aurora MySQL                                                        │
│ • Database: webappdb (Transactions ledger table)                                       │
│ • Security: Inbound port 3306 strictly restricted to Backend App Security Group        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛡️ Key Cloud Engineering Highlights

| Feature | Implementation Details |
| :--- | :--- |
| **Multi-AZ Redundancy** | Infrastructure spanned across `ap-south-2a` and `ap-south-2b` Availability Zones to eliminate single points of failure. |
| **Complete Network Isolation** | Backend compute and database instances reside strictly in **Private Subnets** with no public IP addresses or direct internet ingress. |
| **Dual Load Balancer Pattern** | **External ALB** handles public internet traffic to the Web Tier; **Internal ALB** load balances internal microservice API calls to the App Tier. |
| **Bastion / Jump-Box Workflow** | Secure SSH administration into private instances achieved via jump-box chaining (`Laptop ➔ Frontend EC2 ➔ Backend EC2`) using private SSH key. |
| **Least-Privilege Security Groups** | Security Groups reference each other by Security Group ID rather than IP addresses (e.g. Backend SG only accepts port 4000 from Internal LB SG). |
| **Resilient Process Management** | Express server managed by **PM2 daemon** configured with `pm2 startup systemd` for zero-downtime restarts and automatic boot persistence. |
| **Single Page App Routing** | Nginx configured with `try_files $uri /index.html;` ensuring client-side React routes (`/#/db`) resolve without 404 errors. |
| **Custom Domain & Route 53 Alias** | Domain `nkhlsjbpnit.shop` resolves directly to the External ALB via AWS Route 53 **Alias `A` Record** for free, zero-latency DNS queries. |

---

## 🔒 Security Group Chaining Model

```
[ Internet (0.0.0.0/0) ]
        │ HTTP (Port 80)
        ▼
[ External ALB Security Group ]
        │ HTTP (Port 80)
        ▼
[ Frontend Web Tier Security Group ]
        │ HTTP (Port 80)
        ▼
[ Internal ALB Security Group ]
        │ Custom TCP (Port 4000)
        ▼
[ Backend App Tier Security Group ]
        │ MySQL (Port 3306)
        ▼
[ Aurora Database Security Group ]
```

---

## 📁 Repository Structure

```
.
├── app-tier-back/                  # Tier 2: Node.js Express REST API
│   ├── DbConfig.js                 # Database configuration with environment variable overrides
│   ├── TransactionService.js       # MySQL queries, connection pooling & schema auto-init
│   ├── index.js                    # Express application routes (/health, /transaction)
│   ├── package.json                # Backend dependencies (express, mysql2, cors)
│   └── README.md                   # Backend documentation & API specification
│
├── web-tier-Front/                 # Tier 1: React Single Page Application (SPA)
│   ├── public/                     # Static assets & index.html template
│   ├── src/
│   │   ├── components/             # React components (DatabaseDemo, Home, Navigation)
│   │   ├── App.js                  # HashRouter routing (/#/ and /#/db)
│   │   └── index.js                # React DOM entrypoint
│   ├── nginx.conf                  # Nginx configuration (reverse proxy & SPA routing)
│   ├── package.json                # Frontend dependencies (react, styled-components)
│   └── README.md                   # Frontend build & deployment documentation
│
├── implementation_File/            # Comprehensive Step-by-Step Deployment Documentation
│   ├── DEPLOYMENT_GUIDE.md         # Full command-by-command manual provisioning guide
│   ├── LOAD_BALANCER_AND_ROUTE53_GUIDE.md # External/Internal ALB & Route 53 configuration
│   └── aurora_db_setup.sql         # Aurora MySQL schema & initial seed data script
│
├── .gitignore                      # Git ignore rules protecting keys, secrets & build artifacts
├── Docker-Compose.yml              # Optional local containerized simulation environment
└── README.md                       # Master architecture documentation
```

---

## 🚀 Step-by-Step Deployment Guides

For complete, command-by-command deployment instructions, refer to the detailed implementation guides in `implementation_File/`:

1. **[Core 3-Tier Manual Deployment Guide](implementation_File/DEPLOYMENT_GUIDE.md):**
   * Step 1: Launching EC2 instances in Public & Private subnets.
   * Step 2: Jump-Box SSH connection workflow (`aws-project.pem`).
   * Step 3: Initializing AWS Aurora MySQL via MariaDB client.
   * Step 4: Configuring Backend Node.js Express API & PM2 daemon with systemd persistence.
   * Step 5: Building React SPA and configuring Nginx reverse proxy.
   * Step 6: End-to-end verification and testing.

2. **[Dual Load Balancers & Route 53 Configuration Guide](implementation_File/LOAD_BALANCER_AND_ROUTE53_GUIDE.md):**
   * Configuring the **External Application Load Balancer** on public subnets.
   * Configuring the **Internal Application Load Balancer** on private subnets.
   * Updating Nginx reverse proxy to target the internal ALB.
   * Delegating custom domain nameservers and setting up **Route 53 Alias `A` Record**.
   * Real-world troubleshooting guide (resolving 504 timeouts, browser auto-HTTPS errors, and target registration).

---

## 🧪 Live Verification

Once deployed, the live environment can be verified with standard CLI commands:

```bash
# 1. Verify Route 53 DNS resolution to AWS ALB nodes:
Resolve-DnsName nkhlsjbpnit.shop

# 2. Test Web Tier Health Check through External ALB:
curl http://nkhlsjbpnit.shop/health
# Expected: <!DOCTYPE html><p>Web Tier Health Check OK</p>

# 3. Test App Tier API & Aurora MySQL connectivity through custom domain:
curl http://nkhlsjbpnit.shop/api/transaction
# Expected: {"result":[{"id":...,"amount":...,"description":...}]}

# 4. Access live web dashboard in browser:
http://nkhlsjbpnit.shop/#/db
```

---

## 👨‍💻 Author & Contact

* **Engineer:** Nikhil
* **Repository:** [nikhil8871/AWS](https://github.com/nikhil8871/AWS)
* **Domain:** [http://nkhlsjbpnit.shop/#/db](http://nkhlsjbpnit.shop/#/db)
