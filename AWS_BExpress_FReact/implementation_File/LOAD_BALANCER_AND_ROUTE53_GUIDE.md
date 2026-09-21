# AWS Dual Load Balancers & Route 53 Configuration Guide

This guide documents the exact, production-grade configuration for the **External Application Load Balancer**, **Internal Application Load Balancer**, and **Route 53 DNS** for the 3-tier web application.

---

## 1. Complete Architecture Overview

```
                   Internet / User Browser
                              │
                              ▼  (Custom Domain: http://nkhlsjbpnit.shop)
                   ┌──────────────────────┐
                   │   AWS Route 53 DNS   │  (Alias 'A' Record)
                   └──────────┬───────────┘
                              │
                              ▼  (Port 80)
┌─────────────────────────────────────────────────────────────────────────┐
│ External Application Load Balancer (Internet-Facing)                     │
│ • Subnets: Public Subnets (web-1a-frontend & web-1b-frontend)           │
│ • Listener: HTTP Port 80 ──> Forward to Target Group (external-lb)      │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              ▼  (HTTP Port 80)
┌─────────────────────────────────────────────────────────────────────────┐
│ Tier 1: Web Tier (Frontend EC2)                                         │
│ • Runs Nginx Reverse Proxy + React Single Page Application              │
│ • Serves UI static build from /var/www/html                             │
│ • Intercepts '/api/' calls and proxies to Internal ALB DNS:80           │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              ▼  (HTTP Port 80)
┌─────────────────────────────────────────────────────────────────────────┐
│ Internal Application Load Balancer (Private VPC)                        │
│ • Scheme: Internal (No Public IP)                                       │
│ • Subnets: Private Subnets (app-1a-backend & app-1b-backend)             │
│ • Listener: HTTP Port 80 ──> Forward to Target Group (internal-lb:4000) │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              ▼  (Custom Port 4000)
┌─────────────────────────────────────────────────────────────────────────┐
│ Tier 2: App Tier (Backend EC2)                                          │
│ • Runs Node.js Express API on port 4000 managed by PM2                  │
│ • Connects to Aurora MySQL via MySQL port 3306                          │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              ▼  (MySQL Port 3306)
┌─────────────────────────────────────────────────────────────────────────┐
│ Tier 3: Database Tier (AWS RDS Aurora MySQL)                            │
│ • Cluster: mysql-db.ch8sokem81lg.ap-south-2.rds.amazonaws.com           │
│ • Database: webappdb (Table: transactions)                              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Part 1: External Load Balancer (Internet-Facing)

The External Load Balancer is the public-facing entry point that distributes incoming traffic across Frontend EC2 instances.

### Step 1.1: Create External Target Group (`external-lb`)
1. Go to **EC2 ➔ Target Groups ➔ Create target group**.
2. **Basic Configuration:**
   * **Target type:** `Instances`
   * **Target group name:** `external-lb`
   * **Protocol:** `HTTP` | **Port:** `80`
   * **IP address type:** `IPv4`
   * **VPC:** `my-vpc1a-1b` (`vpc-017ad940d1c376fa3`)
   * **Protocol version:** `HTTP1`
3. **Health checks:**
   * **Health check protocol:** `HTTP`
   * **Health check path:** `/health`
   * **Health check port:** `Traffic port` (80)
   * **Healthy threshold:** `5`
   * **Unhealthy threshold:** `2`
   * **Timeout:** `5` seconds
   * **Interval:** `30` seconds
   * **Success codes:** `200`
4. Click **Next**.
5. **Register Targets:**
   * Select your **`web-Front-1a`** instance (`i-0c50c9a5c93fbdb28`).
   * Port: `80`
   * Click **Include as pending below**.
6. Click **Create target group**.

---

### Step 1.2: External ALB Security Group (`external-lb`)
Verify the security group assigned to the External Load Balancer has these rules:

* **Inbound Rules:**
  | Type | Protocol | Port Range | Source | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | **HTTP** | TCP | `80` | `0.0.0.0/0` | Allow public web traffic |

* **Outbound Rules:**
  | Type | Protocol | Port Range | Destination | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | **All traffic** | All | All | `0.0.0.0/0` | Allow forwarding to Frontend EC2 |

---

### Step 1.3: Create External Load Balancer (`external-lb`)
1. Go to **EC2 ➔ Load Balancers ➔ Create load balancer ➔ Application Load Balancer**.
2. **Basic configuration:**
   * **Load balancer name:** `external-lb`
   * **Scheme:** `Internet-facing`
   * **IP address type:** `IPv4`
3. **Network mapping:**
   * **VPC:** `my-vpc1a-1b`
   * **Subnets (Public):**
     * `ap-south-2a`: `subnet-04ea17dead5bb60a7 (web-1a-frontend)`
     * `ap-south-2b`: `subnet-0277245c214f65797 (web-1b-frontend)`
4. **Security groups:**
   * Select `external-lb (sg-0b42909f83b6d5862)`.
5. **Listeners and routing:**
   * **Protocol:** `HTTP` | **Port:** `80`
   * **Default action:** Forward to `external-lb` (Target Group).
6. Click **Create load balancer**.

---

## 3. Part 2: Internal Load Balancer (Private VPC)

The Internal Load Balancer sits between the Frontend Web Tier and Backend App Tier. It receives API calls from Nginx on Port 80 and delivers them to the Express Backend on Port 4000.

### Step 2.1: Create Internal Target Group (`internal-lb`)
1. Go to **EC2 ➔ Target Groups ➔ Create target group**.
2. **Basic Configuration:**
   * **Target type:** `Instances`
   * **Target group name:** `internal-lb`
   * **Protocol:** `HTTP` | **Port:** `4000` *(Express backend listens on port 4000!)*
   * **VPC:** `my-vpc1a-1b`
3. **Health checks:**
   * **Health check protocol:** `HTTP`
   * **Health check path:** `/health`
   * **Health check port:** `Traffic port` (4000)
   * **Success codes:** `200`
4. Click **Next**.
5. **Register Targets:**
   * Select your **`app-backend-1a`** instance (`i-05fc0249cfdabd923`).
   * **Ports for the selected instances:** Type **`4000`**.
   * Click **Include as pending below**.
6. Click **Create target group**.

---

### Step 2.2: Internal ALB Security Group (`Internal-LB`)
* **Inbound Rules:**
  | Type | Protocol | Port Range | Source | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | **HTTP** | TCP | `80` | `sg-0864a938a5abcef35` *(Frontend SG)* | Allow API traffic from Frontend Nginx |
  | **Custom TCP** | TCP | `4000` | `sg-0864a938a5abcef35` *(Frontend SG)* | Optional auxiliary port |

* **Outbound Rules:**
  | Type | Protocol | Port Range | Destination | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | **All traffic** | All | All | `0.0.0.0/0` | Forward requests to Backend EC2:4000 |

---

### Step 2.3: Backend EC2 Security Group Update (`app-sg-backend`)
For the Backend EC2 to accept traffic from the Internal Load Balancer, its inbound rules must allow Port 4000:

* **Inbound Rules:**
  | Type | Protocol | Port Range | Source | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | **SSH** | TCP | `22` | `sg-0864a938...` *(Frontend SG)* | SSH jump access from Frontend |
  | **Custom TCP** | TCP | `4000` | `sg-05bdef3fe8bb96279` *(Internal-LB SG)* | Accept API requests from Internal LB |

---

### Step 2.4: Create Internal Load Balancer (`internal-lb`)
1. Go to **EC2 ➔ Load Balancers ➔ Create load balancer ➔ Application Load Balancer**.
2. **Basic configuration:**
   * **Load balancer name:** `internal-lb`
   * **Scheme:** `Internal` *(Strictly Internal, no public IP assigned)*
   * **IP address type:** `IPv4`
3. **Network mapping:**
   * **VPC:** `my-vpc1a-1b`
   * **Subnets (Private):**
     * `ap-south-2a`: `subnet-0b468c3d3b97a7404 (app-1a-backend)`
     * `ap-south-2b`: `subnet-0e138e0d104ce4291 (app-1b-backend)`
4. **Security groups:**
   * Select `Internal-LB (sg-05bdef3fe8bb96279)`.
5. **Listeners and routing:**
   * **Protocol:** `HTTP` | **Port:** `80`
   * **Default action:** Forward to `internal-lb` (Target Group delivering to port 4000).
6. Click **Create load balancer**.
7. Note down the **DNS Name**:
   `internal-internallb-164487092.ap-south-2.elb.amazonaws.com`

---

### Step 2.5: Update Frontend Nginx to Route via Internal Load Balancer
On the **Frontend EC2**, edit `/etc/nginx/nginx.conf`:

```bash
sudo vi /etc/nginx/nginx.conf
```

Update the `/api/` reverse proxy block:
```nginx
        # Reverse Proxy to Backend Express API via Internal Load Balancer
        location /api/ {
            proxy_pass http://internal-internallb-164487092.ap-south-2.elb.amazonaws.com/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
```

Restart Nginx:
```bash
sudo systemctl restart nginx
```

---

## 4. Part 3: Route 53 Custom DNS Configuration

Route 53 maps your custom domain (`nkhlsjbpnit.shop`) directly to the External Application Load Balancer.

### Step 3.1: Nameserver Delegation (at Domain Registrar)
Verify that your domain registrar custom nameservers match Route 53's NS records:
```text
ns-1233.awsdns-26.org
ns-564.awsdns-06.net
ns-1705.awsdns-21.co.uk
ns-463.awsdns-57.com
```

---

### Step 3.2: Create Route 53 Alias Record
1. Go to **Route 53 ➔ Hosted zones ➔ `nkhlsjbpnit.shop`**.
2. Click **Create record**.
3. **Record details:**
   * **Record name:** Leave blank (for apex/root domain `nkhlsjbpnit.shop`)
   * **Record type:** `A — Routes traffic to an IPv4 address and some AWS resources`
   * **Alias:** **Toggle ON (Blue)**
   * **Route traffic to:**
     * Dropdown 1: `Alias to Application and Classic Load Balancer`
     * Dropdown 2: `Asia Pacific (Hyderabad) [ap-south-2]`
     * Dropdown 3: `dualstack.external-lb-1694020571.ap-south-2.elb.amazonaws.com`
   * **Routing policy:** `Simple routing`
   * **Evaluate target health:** `Yes`
4. Click **Save / Create records**.

---

## 5. Troubleshooting & Key Lessons Learned

| Issue Encountered | Root Cause | Solution |
| :--- | :--- | :--- |
| **`504 Gateway Time-out` on `/api/transaction`** | 1. Backend EC2 was not registered under the target group.<br>2. Backend SG blocked Internal ALB on port 4000. | Register `app-backend-1a` on Port **`4000`** in target group, and add inbound Port 4000 from Internal LB SG (`sg-05bdef...`). |
| **`ERR_CONNECTION_REFUSED` in browser** | Modern browsers (Chrome, Safari) auto-force `https://` (Port 443). Since ALB only had HTTP Port 80 listener, Port 443 rejected connection. | Explicitly type **`http://`** in the address bar: `http://nkhlsjbpnit.shop/#/db`. |
| **Blank White Screen in React (`TypeError: Cannot read properties of undefined (reading 'map')`)** | Backend Node.js was started while Aurora DB was still offline, returning an error response without `.result`. | Ensure Aurora DB is `Available`, then restart backend via `pm2 restart backend`. |
| **Missing `http://` in Nginx `proxy_pass`** | Writing `proxy_pass internal-lb...` without `http://` causes invalid URL syntax error in Nginx. | Always prepend `http://`: `proxy_pass http://internal-lb...;`. |
| **A Record with Domain string instead of IP** | Pasting load balancer hostname into standard A-record value box. | Select **Alias to Application and Classic Load Balancer** instead of raw IP address. |

---

## 6. End-to-End Verification Commands

Run these tests to verify every layer independently:

```bash
# 1. Verify Route 53 DNS resolves to ALB IP addresses:
Resolve-DnsName nkhlsjbpnit.shop

# 2. Verify External ALB HTTP port 80 health check:
curl http://nkhlsjbpnit.shop/health
# Expected Output: <!DOCTYPE html><p>Web Tier Health Check OK</p>

# 3. Verify End-to-End Database Fetch via Custom Domain:
curl http://nkhlsjbpnit.shop/api/transaction
# Expected Output: {"result":[{"id":...,"amount":...,"description":...}]}

# 4. Open in Web Browser:
http://nkhlsjbpnit.shop/#/db
```
