#!/bin/bash
# Requirement 12: Demonstrate NGINX Failover Mechanism
echo "Starting Failover Demonstration..."

# 1. Successful request to US
echo "Request 1: Targeting US Endpoint..."
curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080/us/health"
echo -e "\nStopping backend-us container..."

# 2. Stop the US backend
docker stop backend_us

# 3. Subsequent request to US (Handled by EU)
echo "Request 2: Targeting US Endpoint (Failover in action)..."
curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080/us/health"

# 4. Restart container
docker start backend_us
echo -e "\nFailover Demonstration Complete."