#!/bin/bash

# NovelHub n8n Integration Test Script
# This script tests the complete n8n + NovelHub workflow

echo "🧪 NovelHub n8n Integration Test"
echo "================================"

# Test 1: Health Check
echo ""
echo "1️⃣ Testing n8n-lite health..."
curl -s http://localhost:5678/health | jq '.'

# Test 2: NovelHub API Health
echo ""
echo "2️⃣ Testing NovelHub API..."
curl -s http://localhost:3000/api/n8n?action=health | jq '.'

# Test 3: List workflows
echo ""
echo "3️⃣ Listing workflows..."
curl -s http://localhost:3000/api/n8n?action=workflows | jq '.workflows[:3]'

# Test 4: Create crawl-translate workflow
echo ""
echo "4️⃣ Creating crawl-translate workflow..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/n8n \
  -H "Content-Type: application/json" \
  -d '{
    "action": "crawl-translate",
    "gutenbergId": 12345,
    "translate": true,
    "aiModel": "gpt-3.5-turbo"
  }')

echo "$RESPONSE" | jq '.'

# Extract job ID from response
JOB_ID=$(echo "$RESPONSE" | jq -r '.jobId')

if [ "$JOB_ID" != "null" ] && [ -n "$JOB_ID" ]; then
  echo ""
  echo "5️⃣ Workflow started with ID: $JOB_ID"
  echo "   Monitoring progress..."
  
  # Monitor progress for 30 seconds
  for i in {1..6}; do
    sleep 5
    echo ""
    echo "   Status check $i/6:"
    curl -s "http://localhost:3000/api/executions/$JOB_ID" | jq '.'
  done
  
  echo ""
  echo "✅ Test completed! Check the NovelHub UI for results."
else
  echo ""
  echo "❌ Failed to start workflow"
fi

echo ""
echo "📝 Next steps:"
echo "1. Open http://localhost:3000/n8n to see the workflow manager"
echo "2. Open http://localhost:3000 to see the book library"
echo "3. Set your AI_API_KEY in .env.local for translation"
echo "4. Use the n8n workflow manager to crawl more books"