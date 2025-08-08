# Troubleshooting Guide - "Failed to Fetch" Error

## Problem
You're getting a "failed to fetch" error when trying to use the waypoint API functionality.

## Quick Fix Steps

### 1. Check if the server is running
```bash
curl -X GET http://localhost:8001/health
```

**Expected response:**
```json
{"status":"OK","message":"Test server is running","timestamp":"..."}
```

**If you get "Connection refused":**
```bash
# Start the test server
node test-server.js
```

### 2. Test API endpoints manually
```bash
# Test the waypoint endpoint
curl -X POST http://localhost:8001/execute-command-with-waypoints \
  -H "Content-Type: application/json" \
  -d '{"command": "Test", "waypoints": []}'
```

### 3. Test from browser console
Open the browser console and run:
```javascript
// Test network connectivity
testNetworkConnectivity()

// Test direct API connection
testDirectAPI()

// Test waypoint API functionality
testWaypointAPI()
```

## Common Issues and Solutions

### Issue 1: Server not running
**Symptoms:** "Connection refused" error
**Solution:** Start the test server
```bash
node test-server.js
```

### Issue 2: CORS errors
**Symptoms:** CORS-related errors in browser console
**Solution:** The server now has enhanced CORS configuration. Restart the server:
```bash
pkill -f "node test-server.js"
node test-server.js
```

### Issue 3: Port already in use
**Symptoms:** "EADDRINUSE" error
**Solution:** Kill existing process and restart
```bash
pkill -f "node test-server.js"
sleep 2
node test-server.js
```

### Issue 4: Network connectivity issues
**Symptoms:** "Failed to fetch" with network errors
**Solution:** Check firewall settings and try:
```bash
# Check if port 8001 is listening
netstat -tulpn | grep 8001

# Test localhost connectivity
ping localhost
```

### Issue 5: Electron security restrictions
**Symptoms:** Fetch blocked by Electron security
**Solution:** The application should handle this, but if issues persist:
1. Check if the main process allows localhost connections
2. Ensure the renderer process has network permissions

## Debugging Steps

### Step 1: Check server logs
Look at the terminal where `test-server.js` is running for any error messages.

### Step 2: Check browser console
Open Developer Tools (F12) and look for:
- Network errors
- CORS errors
- JavaScript errors

### Step 3: Test step by step
```javascript
// 1. Test basic connectivity
testNetworkConnectivity()

// 2. Test direct API calls
testDirectAPI()

// 3. Test the full waypoint functionality
testWaypointAPI()
```

### Step 4: Check waypoint data
```javascript
// Check if waypoints are loaded
console.log('Available waypoints:', window.aiAgentInstance?.waypoints)

// Check context waypoints
console.log('Context waypoints:', window.aiAgentInstance?.getSelectedContextWaypoints())
```

## Expected Behavior

### When working correctly:
1. Server shows: `🚀 Test server running on http://localhost:8001`
2. Health check returns: `{"status":"OK","message":"Test server is running"}`
3. Browser console shows successful API calls
4. Waypoint data is sent and received correctly

### API Request Format:
```json
{
  "command": "[SURVEILLANCE] Fly to waypoint",
  "waypoints": [
    {
      "id": "1754256562837_...",
      "name": "Homee",
      "type": "polygon",
      "coordinates": [...],
      "description": "polygon waypoint created via drawing tools",
      "tags": ["polygon", "waypoint", "drawn"],
      "metadata": {...}
    }
  ]
}
```

## Still Having Issues?

If the problem persists:

1. **Check the server terminal** for detailed error logs
2. **Check the browser console** for JavaScript errors
3. **Try restarting both** the server and the Electron app
4. **Verify waypoints exist** in the system before testing
5. **Test with a simple command** first, then add waypoints

## Support Commands

```bash
# Start server
node test-server.js

# Test server health
curl http://localhost:8001/health

# Test waypoint endpoint
curl -X POST http://localhost:8001/execute-command-with-waypoints \
  -H "Content-Type: application/json" \
  -d '{"command": "test", "waypoints": []}'

# Kill server
pkill -f "node test-server.js"
``` 