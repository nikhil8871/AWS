# Web Tier (Frontend React SPA)

The **Web Tier** is a responsive Single Page Application (SPA) built with **React** and styled-components, served by a production **Nginx** web server and reverse proxy. It represents Tier 1 of this 3-tier AWS cloud architecture.

---

## 🏗️ Architecture Role

* **Public Subnet Deployment:** Hosted on EC2 instances inside public subnets (`10.0.1.0/24`) behind an **Internet-Facing Application Load Balancer**.
* **Decoupled API Routing:** The React app makes API calls using relative URLs (`/api/transaction`). The code contains zero hardcoded IP addresses or secrets.
* **Nginx Reverse Proxy:** Nginx serves the compiled static React build files from `/var/www/html` and secretly proxies `/api/*` traffic across the private VPC to the **Internal Application Load Balancer**.
* **SPA Routing:** Configured with `try_files $uri /index.html;` so page refreshes and direct URL navigation (`/#/db`) never produce 404 errors.

---

## 📁 Key Routes

| Route | Component | Description |
| :--- | :--- | :--- |
| `/#/` | `<Home />` | Project architecture landing page and overview |
| `/#/db` | `<DatabaseDemo />` | Live Aurora MySQL transaction dashboard (Add, View, Delete records) |

---

## 🛠️ Build & Deployment Instructions

### 1. Install Dependencies:
```bash
npm install
```

### 2. Compile Production Bundle:
```bash
npm run build
```
This generates optimized, minified static HTML, CSS, and JS assets in the `build/` directory.

### 3. Deploy to Nginx Web Root:
```bash
sudo mkdir -p /var/www/html
sudo rm -rf /var/www/html/*
sudo cp -r build/* /var/www/html/
sudo chown -R nginx:nginx /var/www/html
sudo chmod -R 755 /var/www/html
```

---

## ⚙️ Nginx Configuration (`/etc/nginx/nginx.conf`)

Nginx performs two essential roles in the Web Tier:
```nginx
    # 1. React Single Page App routing
    location / {
        root    /var/www/html;
        index   index.html index.htm;
        try_files $uri /index.html;
    }

    # 2. Reverse Proxy to Internal ALB (API calls)
    location /api/ {
        proxy_pass http://<YOUR_INTERNAL_ALB_DNS>/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 3. Web Tier Health Check (used by External ALB)
    location /health {
        default_type text/html;
        return 200 "<!DOCTYPE html><p>Web Tier Health Check OK</p>\n";
    }
```
