# 🏠 Distributed Property Listing System

A robust, multi-region property management system featuring:

* ✅ Optimistic Locking
* ✅ Idempotency Protection
* ✅ Asynchronous Cross-Region Replication via Apache Kafka
* ✅ NGINX Reverse Proxy with Failover
* ✅ Dockerized Multi-Container Architecture

---

# 🚀 1. Getting Started

## 📌 Prerequisites

Make sure you have installed:

* Docker
* Docker Compose
* Git
* Bash / Git Bash / PowerShell

---

## 📥 Clone the Repository

```bash
git clone https://github.com/sai1432-ss/distributed-property-listing-system.git
cd distributed-property-listing-system
```

---

## 🐳 Build and Start Services

This builds backend images and starts the full 7-container stack:

* 2 Backend Services (US & EU)
* 2 PostgreSQL Databases
* Kafka
* Zookeeper
* NGINX Proxy

```bash
docker-compose up -d --build
```

⚠️ Wait approximately 60 seconds after startup for Kafka leader election to complete.

To verify containers are running:

```bash
docker ps
```

---

# 🛠️ 2. Core API Functionality

All traffic is routed through:

```
http://localhost:8080
```

---

## ❤️ Health Checks

### US Region

```bash
curl http://localhost:8080/us/health
```

### EU Region

```bash
curl http://localhost:8080/eu/health
```

Expected Response:

```json
{"status":"OK"}
```

---

## 🏡 Get Property Details

```bash
curl http://localhost:8080/us/properties/77
```

---

## 🔄 Update Property (Optimistic Locking)

```bash
curl -X PUT http://localhost:8080/us/properties/77 \
  -H "Content-Type: application/json" \
  -H "X-Request-ID: $(uuidgen)" \
  -d '{"price": 9999, "version": 1}'
```

---

# ⚠️ 3. Error Code Verification

## 🔴 409 Conflict (Optimistic Locking)

Occurs when using an outdated version number.

### Steps:

1. Perform update (version becomes 2).
2. Repeat update using `"version": 1`.

Expected Response:

```json
{
  "error": "Conflict: Version mismatch or ID not found"
}
```

---

## 🟡 422 Unprocessable Entity (Idempotency)

Occurs when the same `X-Request-ID` is reused.

```bash
curl -X PUT http://localhost:8080/us/properties/77 \
  -H "Content-Type: application/json" \
  -H "X-Request-ID: test-123" \
  -d '{"price": 9999, "version": 2}'
```

Run the same command again.

Expected Response:

```json
{
  "error": "Unprocessable Entity",
  "message": "Duplicate request detected"
}
```

---

# 🛰️ 4. Distributed Logic & Monitoring

## 🌍 Cross-Region Replication

1️⃣ Update property in US:

```bash
curl -X PUT http://localhost:8080/us/properties/77 \
  -H "Content-Type: application/json" \
  -H "X-Request-ID: $(uuidgen)" \
  -d '{"price": 8888, "version": 2}'
```

2️⃣ Wait 5 seconds.

3️⃣ Verify in EU:

```bash
curl http://localhost:8080/eu/properties/77
```

You should see updated data replicated via Kafka.

---

## ⏱️ Replication Lag API

```bash
curl http://localhost:8080/eu/replication-lag
```

---

# 🧪 5. Automated Tests

All tests are inside the `tests/` directory.

## 🧪 Test 1: Concurrent Optimistic Locking

```bash
docker cp tests/ backend_us:/app/
docker exec -it backend_us sh ./tests/req-optimistic-locking.sh
```

---

## 🔁 Test 2: Failover Demonstration

Stop US backend:

```bash
docker stop backend_us
```

Health check:

```bash
curl http://localhost:8080/us/health
```

Expected: Should still return OK (Failover to EU).

Restart:

```bash
docker start backend_us
```

---

# 📋 6. Infrastructure Verification

## 🗄️ Database Seeding

```bash
docker exec -it db_us psql -U user -d property_db_us -c "SELECT count(*) FROM properties;"
```

Expected:

```
 count
-------
 1000
```

---

## 📊 NGINX Custom Logging

```bash
docker logs nginx_proxy
```

Look for:

```
upstream_response_time=0.00x
```

---

# 🛑 Stop the System

```bash
docker-compose down
```

Remove volumes:

```bash
docker-compose down -v
```

---

# 🧱 Architecture Overview

```
Client → NGINX → Regional Backend (US/EU)
                         ↓
                      PostgreSQL
                         ↓
                       Kafka
                         ↓
               Cross-Region Replication
```

---

# 🎯 Key Features Implemented

* Distributed Multi-Region Deployment
* Optimistic Concurrency Control
* Idempotent API Design
* Kafka Event-Driven Replication
* NGINX Failover Routing
* Automated Testing Scripts
* Dockerized Infrastructure
* Database Seeding
* Replication Lag Monitoring

---

