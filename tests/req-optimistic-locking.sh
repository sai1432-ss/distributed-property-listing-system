#!/bin/sh
# Use port 3000 because we are running INSIDE the container network
echo "Testing Concurrent Optimistic Locking..."

# Request 1
curl -X PUT "http://localhost:3000/properties/3" \
     -H "Content-Type: application/json" \
     -H "X-Request-ID: concurrent-1" \
     -d '{"price": 1000, "version": 1}' &

# Request 2
curl -X PUT "http://localhost:3000/properties/3" \
     -H "Content-Type: application/json" \
     -H "X-Request-ID: concurrent-2" \
     -d '{"price": 2000, "version": 1}' &

wait
echo -e "\nConcurrent test finished."