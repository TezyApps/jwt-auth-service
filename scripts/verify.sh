#!/usr/bin/env bash
EMAIL="test2@example.com"
PASSWORD="password123"

echo "=== 1. register (expect 201) ==="
curl -i -X POST localhost:3000/auth/register -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"

echo -e "\n\n=== 2. register again (expect 409) ==="
curl -i -X POST localhost:3000/auth/register -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"

echo -e "\n\n=== 3. login (expect 200, accessToken) ==="
LOGIN_RESPONSE=$(curl -s -X POST localhost:3000/auth/login -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
echo "$LOGIN_RESPONSE"
TOKEN=$(echo "$LOGIN_RESPONSE" | sed -E 's/.*"accessToken":"([^"]+)".*/\1/')
echo "extracted token: $TOKEN"

echo -e "\n\n=== 4. /me with token (expect 200, email) ==="
curl -i localhost:3000/me -H "Authorization: Bearer $TOKEN"

echo -e "\n\n=== 5. /me without token (expect 401) ==="
curl -i localhost:3000/me
