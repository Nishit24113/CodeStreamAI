# 🧪 **Multi-User Testing Plan with 5 Agents**

## **Objective**
Test real-time multi-user collaboration with 5 simultaneous users in the same room to verify WebSocket synchronization, code sharing, chat functionality, and analytics tracking.

## **Test Environment**
- **Frontend:** https://d3meafwl386jrm.cloudfront.net
- **API:** https://2582505qm2.execute-api.us-west-2.amazonaws.com/prod
- **WebSocket:** wss://wzz3aahj08.execute-api.us-west-2.amazonaws.com/prod
- **Test Room:** `multi-user-test-room-2026`

## **Test Users (5 Agents)**
1. **Agent 1 (Alice)** - Python Developer
   - Email: alice@testuser.com
   - Username: alice_dev
   - Role: Write Python code, execute tests

2. **Agent 2 (Bob)** - JavaScript Developer
   - Email: bob@testuser.com
   - Username: bob_dev
   - Role: Write JavaScript code, test JS execution

3. **Agent 3 (Carol)** - Code Reviewer
   - Email: carol@testuser.com
   - Username: carol_reviewer
   - Role: Review code, provide feedback via chat

4. **Agent 4 (Dave)** - Tester
   - Email: dave@testuser.com
   - Username: dave_tester
   - Role: Execute code, report bugs, use version history

5. **Agent 5 (Eve)** - Observer
   - Email: eve@testuser.com
   - Username: eve_observer
   - Role: Monitor activity, test cursor tracking, analytics

## **Test Scenarios**

### **Scenario 1: Sequential Registration & Login (2 min)**
**Goal:** Verify all 5 users can register and log in

**Steps:**
1. Agent 1 registers and logs in
2. Agent 2 registers and logs in
3. Agent 3 registers and logs in
4. Agent 4 registers and logs in
5. Agent 5 registers and logs in

**Success Criteria:**
- ✅ All 5 users receive JWT tokens
- ✅ All 5 users can access dashboard
- ✅ No login loops

### **Scenario 2: Join Same Room (2 min)**
**Goal:** Verify all 5 users can join the same collaborative room

**Steps:**
1. Agent 1 opens editor (creates room)
2. Agent 1 copies room link: `/editor?room=multi-user-test-room-2026`
3. Agents 2-5 open the same room URL
4. All agents verify they see "Active Users: 5"

**Success Criteria:**
- ✅ All 5 WebSocket connections established
- ✅ Active user count shows 5
- ✅ All users listed in active users panel
- ✅ No connection errors

### **Scenario 3: Real-Time Code Synchronization (3 min)**
**Goal:** Verify code changes sync across all 5 users in real-time

**Steps:**
1. **Agent 1 (Alice)** types Python code:
   ```python
   def greet(name):
       return f"Hello, {name}!"
   ```

2. **Agents 2-5** verify they see the code appear in real-time

3. **Agent 2 (Bob)** adds JavaScript code:
   ```javascript
   function add(a, b) {
       return a + b;
   }
   ```

4. **Agents 1, 3-5** verify they see Bob's addition

5. **Agent 3 (Carol)** adds a comment:
   ```python
   # Code review: Looks good! Test coverage needed.
   ```

6. **All agents** verify they see the comment

**Success Criteria:**
- ✅ All code changes appear in real-time (<1 second latency)
- ✅ No conflicts or overwrites
- ✅ Code persists across WebSocket messages
- ✅ All 5 users see identical code

### **Scenario 4: Cursor Position Tracking (1 min)**
**Goal:** Verify remote cursor indicators work

**Steps:**
1. Agent 1 moves cursor to line 5
2. Agents 2-5 verify they see Agent 1's cursor indicator
3. Agent 2 moves cursor to line 10
4. All other agents see Agent 2's cursor
5. Multiple agents move cursors simultaneously

**Success Criteria:**
- ✅ Remote cursors visible
- ✅ Cursors labeled with usernames
- ✅ Cursor positions update in real-time
- ✅ Multiple cursors can be tracked simultaneously

### **Scenario 5: Team Chat (2 min)**
**Goal:** Verify chat messages sync across all users

**Steps:**
1. **Agent 1** opens chat, sends: "Alice: Let's collaborate!"
2. **Agents 2-5** verify they receive the message
3. **Agent 2** replies: "Bob: Sounds good!"
4. **Agent 3** sends: "Carol: I'll review the code"
5. **Agent 4** sends: "Dave: Running tests now"
6. **Agent 5** sends: "Eve: Monitoring everything"
7. All agents verify they see all 5 messages in order

**Success Criteria:**
- ✅ All messages delivered to all users
- ✅ Messages show correct username
- ✅ Messages show correct timestamp
- ✅ Message order preserved
- ✅ No duplicate messages

### **Scenario 6: Code Execution - Python (2 min)**
**Goal:** Verify Python code execution works with multiple users

**Steps:**
1. **Agent 1** writes and executes Python code:
   ```python
   print("Hello from Python!")
   result = 42 + 58
   print(f"Result: {result}")
   ```

2. **Agent 1** clicks "Run Code"
3. **All agents** verify they see the output:
   ```
   Hello from Python!
   Result: 100
   ```

**Success Criteria:**
- ✅ Python code executes successfully
- ✅ Output shows in Agent 1's console
- ✅ Other agents can see the code
- ✅ Execution time displayed

### **Scenario 7: Code Execution - JavaScript (2 min)**
**Goal:** Verify JavaScript code execution works with multiple users

**Steps:**
1. **Agent 2** writes and executes JavaScript code:
   ```javascript
   console.log("Hello from JavaScript!");
   const result = 42 + 58;
   console.log(`Result: ${result}`);
   ```

2. **Agent 2** clicks "Run Code"
3. **All agents** verify they see the output:
   ```
   Hello from JavaScript!
   Result: 100
   ```

**Success Criteria:**
- ✅ JavaScript code executes successfully
- ✅ Output shows in Agent 2's console
- ✅ Other agents can see the code
- ✅ Execution time displayed

### **Scenario 8: Code Save & Version Control (3 min)**
**Goal:** Verify save and version history work with multiple users

**Steps:**
1. **Agent 1** clicks "Save" - Creates Version 1
2. **Agent 2** modifies code, clicks "Save" - Creates Version 2
3. **Agent 3** modifies code, clicks "Save" - Creates Version 3
4. **Agent 4** clicks "History" button
5. **Agent 4** verifies seeing 3 versions with:
   - Version number
   - Timestamp
   - Author (userId)
6. **Agent 4** selects Version 1, clicks "Restore"
7. **All agents** verify code reverts to Version 1

**Success Criteria:**
- ✅ All saves create new versions
- ✅ Version numbers increment correctly
- ✅ Version history shows all versions
- ✅ Restore works correctly
- ✅ All users see restored version

### **Scenario 9: Concurrent Actions (2 min)**
**Goal:** Verify system handles simultaneous actions

**Steps:**
1. **All 5 agents simultaneously:**
   - Agent 1: Typing code
   - Agent 2: Moving cursor
   - Agent 3: Sending chat message
   - Agent 4: Clicking save
   - Agent 5: Running code

2. Verify no conflicts or errors

**Success Criteria:**
- ✅ All actions complete successfully
- ✅ No WebSocket disconnections
- ✅ No data loss
- ✅ No race conditions
- ✅ System remains responsive

### **Scenario 10: User Disconnection & Reconnection (2 min)**
**Goal:** Verify system handles user disconnections gracefully

**Steps:**
1. **Agent 5** closes browser tab (disconnects)
2. **Agents 1-4** verify "Active Users" changes to 4
3. **Agents 1-4** receive "user_left" notification
4. **Agent 5** reopens room URL (reconnects)
5. **Agents 1-4** verify "Active Users" changes to 5
6. **Agent 5** sees latest code version

**Success Criteria:**
- ✅ Disconnection detected and broadcast
- ✅ Active user count updates
- ✅ Reconnection successful
- ✅ No data loss for disconnected user
- ✅ Code syncs on reconnection

### **Scenario 11: Real Analytics Verification (2 min)**
**Goal:** Verify analytics show real data from DynamoDB

**Steps:**
1. **Agent 1** clicks "Analytics" button on dashboard
2. Verify analytics modal shows:
   - Total Sessions: 1+ (room count)
   - Total Code Lines: >0 (actual code lines)
   - Total Executions: 2+ (Python + JavaScript)
   - Languages Used: [Python, JavaScript]
   - This Week Sessions: 1+
   - Recent Activity: Shows actual saves

**Success Criteria:**
- ✅ Analytics fetches from `/api/analytics/user/{userId}`
- ✅ Shows real data from DynamoDB
- ✅ Not showing mock data
- ✅ Metrics match actual activity
- ✅ Recent activity shows actual events

### **Scenario 12: Stress Test - Rapid Code Changes (2 min)**
**Goal:** Verify system handles high-frequency updates

**Steps:**
1. **Agent 1** rapidly types code (fast typing)
2. **Agent 2** simultaneously types different code
3. **Agent 3** sends multiple chat messages quickly
4. **All agents** verify:
   - All changes sync
   - No lost characters
   - No WebSocket errors
   - Chat messages all delivered

**Success Criteria:**
- ✅ All changes synced
- ✅ No data loss
- ✅ WebSocket remains stable
- ✅ Latency < 100ms

### **Scenario 13: AI Analyze Feature (1 min)**
**Goal:** Verify AI Analyze button works

**Steps:**
1. **Agent 3** writes some Python code
2. **Agent 3** clicks "AI Analyze" button
3. **Agent 3** waits for analysis (2 seconds)
4. **Agent 3** verifies AI suggestion appears in output console

**Success Criteria:**
- ✅ AI Analyze button visible
- ✅ Loading state shows "Analyzing..."
- ✅ Suggestion appears after 2 seconds
- ✅ Suggestion is relevant (mock for now)

### **Scenario 14: Copy Room Link (1 min)**
**Goal:** Verify room link sharing works

**Steps:**
1. **Agent 1** clicks "Copy Link" button
2. Verify button shows "Copied!" feedback
3. **Agent 1** opens new incognito window
4. **Agent 1** pastes link
5. Verify room opens correctly

**Success Criteria:**
- ✅ Link copied to clipboard
- ✅ Feedback shows
- ✅ Link works in new browser
- ✅ Room ID matches

### **Scenario 15: Load Testing (3 min)**
**Goal:** Verify system handles sustained load

**Steps:**
1. All 5 agents remain connected for 3 minutes
2. Agents perform various actions:
   - Typing
   - Chatting
   - Saving
   - Executing code
   - Viewing analytics
3. Monitor for:
   - WebSocket stability
   - Response times
   - Error rates
   - Memory leaks

**Success Criteria:**
- ✅ No WebSocket disconnections
- ✅ Response time < 100ms
- ✅ No errors in console
- ✅ System remains responsive

## **Overall Test Results Template**

### **Pass/Fail Criteria**

| Scenario | Description | Expected | Result | Pass/Fail |
|----------|-------------|----------|--------|-----------|
| 1 | Registration & Login | All 5 users login | | ☐ |
| 2 | Join Same Room | All 5 in one room | | ☐ |
| 3 | Code Synchronization | Real-time sync | | ☐ |
| 4 | Cursor Tracking | Remote cursors | | ☐ |
| 5 | Team Chat | Messages sync | | ☐ |
| 6 | Python Execution | Code runs | | ☐ |
| 7 | JavaScript Execution | Code runs | | ☐ |
| 8 | Version Control | Saves & restores | | ☐ |
| 9 | Concurrent Actions | No conflicts | | ☐ |
| 10 | Disconnection | Graceful handling | | ☐ |
| 11 | Real Analytics | Shows real data | | ☐ |
| 12 | Stress Test | Handles rapid updates | | ☐ |
| 13 | AI Analyze | Feature works | | ☐ |
| 14 | Copy Link | Link sharing | | ☐ |
| 15 | Load Testing | Sustained operation | | ☐ |

### **Success Rate Target: 90%+ (14/15 scenarios passing)**

---

## **Test Execution Timeline**

**Total Duration:** 30 minutes

```
00:00 - 00:02  |  Scenario 1: Registration & Login
00:02 - 00:04  |  Scenario 2: Join Same Room
00:04 - 00:07  |  Scenario 3: Code Synchronization
00:07 - 00:08  |  Scenario 4: Cursor Tracking
00:08 - 00:10  |  Scenario 5: Team Chat
00:10 - 00:12  |  Scenario 6: Python Execution
00:12 - 00:14  |  Scenario 7: JavaScript Execution
00:14 - 00:17  |  Scenario 8: Version Control
00:17 - 00:19  |  Scenario 9: Concurrent Actions
00:19 - 00:21  |  Scenario 10: Disconnection
00:21 - 00:23  |  Scenario 11: Real Analytics
00:23 - 00:25  |  Scenario 12: Stress Test
00:25 - 00:26  |  Scenario 13: AI Analyze
00:26 - 00:27  |  Scenario 14: Copy Link
00:27 - 00:30  |  Scenario 15: Load Testing
```

---

## **Post-Test Verification**

After all scenarios:

1. **Check DynamoDB:**
   - Users Table: 5 new users
   - CodeRooms Table: Multiple versions
   - ChatMessages Table: All messages
   - Connections Table: Connection records

2. **Check CloudWatch Logs:**
   - Lambda invocations
   - WebSocket messages
   - Error rates

3. **Check Analytics:**
   - Real data populated
   - Metrics accurate

4. **Check Infrastructure:**
   - No Lambda throttling
   - No DynamoDB throttling
   - API Gateway within limits

---

## **Known Limitations to Note**

1. **Cursor Tracking:** May have higher latency
2. **Auto-Save:** 30-second interval
3. **WebSocket Reconnect:** May take 1-2 seconds
4. **Analytics:** First load may be slow (cold start)

---

**This test plan ensures 100% production readiness by verifying all critical user flows with real concurrent users.**
