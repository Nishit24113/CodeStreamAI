# 👥 **CodeStream AI - User Flow Diagrams**

## **1. Complete User Journey**

```mermaid
graph TB
    Start([User Visits Website]) --> Landing[Landing Page]
    Landing -->|Click Get Started| Register[Registration Page]
    Landing -->|Click Sign In| Login[Login Page]
    
    Register -->|Fill Form| RegSubmit{Submit<br/>Registration}
    RegSubmit -->|Success| Dashboard
    RegSubmit -->|Error| RegError[Show Error]
    RegError --> Register
    
    Login -->|Fill Form| LoginSubmit{Submit<br/>Login}
    LoginSubmit -->|Success| Dashboard
    LoginSubmit -->|Error| LoginError[Show Error]
    LoginError --> Login
    
    Dashboard[Dashboard Page] --> Actions{User Action?}
    
    Actions -->|Open Editor| Editor[Code Editor]
    Actions -->|View Workers| Workers[Workers Page]
    Actions -->|Search Code| Search[Search Page]
    Actions -->|View Analytics| Analytics[Analytics Modal]
    Actions -->|Logout| Landing
    
    Editor --> EditorActions{Editor Action?}
    EditorActions -->|Write Code| CodeSync[Real-time Sync]
    EditorActions -->|Run Code| Execute[Code Execution]
    EditorActions -->|Save Code| Save[Save to DB]
    EditorActions -->|View History| History[Version History]
    EditorActions -->|Open Chat| Chat[Team Chat]
    EditorActions -->|AI Analyze| AI[AI Analysis]
    EditorActions -->|Copy Link| Share[Share Room Link]
    EditorActions -->|Back| Dashboard
    
    CodeSync --> MultiUser{Other Users<br/>in Room?}
    MultiUser -->|Yes| Broadcast[Broadcast Changes]
    MultiUser -->|No| EditorActions
    Broadcast --> OtherUsers[Other Users See Changes]
    OtherUsers --> EditorActions
    
    Execute --> Result[Show Output]
    Result --> EditorActions
    
    Save --> Version[Create Version]
    Version --> EditorActions
    
    History --> ViewHistory[View All Versions]
    ViewHistory -->|Restore| LoadVersion[Load Version]
    LoadVersion --> EditorActions
    
    Chat --> SendMsg[Send Message]
    SendMsg --> BroadcastMsg[Broadcast to Room]
    BroadcastMsg --> EditorActions
    
    AI --> Analyze[Analyze Code]
    Analyze --> Suggestion[Show Suggestion]
    Suggestion --> EditorActions
    
    Share --> Clipboard[Copy to Clipboard]
    Clipboard --> EditorActions
    
    Workers --> ViewStats[View Lambda Stats]
    ViewStats --> Dashboard
    
    Search --> SearchResults[Show Results]
    SearchResults --> Dashboard
    
    Analytics --> ViewMetrics[View User Metrics]
    ViewMetrics --> Dashboard
    
    style Start fill:#e1f5ff
    style Dashboard fill:#fff4e1
    style Editor fill:#e8f5e9
    style Execute fill:#ffe4e1
    style CodeSync fill:#f3e5f5
```

---

## **2. Authentication Flow (Detailed)**

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant Frontend
    participant API
    participant Lambda
    participant DB

    Note over User,DB: Registration Flow
    
    User->>Browser: Visits https://codestream.ai
    Browser->>Frontend: Load Landing Page
    Frontend-->>Browser: Show Landing Page
    User->>Browser: Clicks "Get Started"
    Browser->>Frontend: Navigate to /register
    
    User->>Frontend: Enter email, username, password
    Frontend->>Frontend: Validate input<br/>(min 8 chars, match passwords)
    
    Frontend->>API: POST /api/auth/register
    API->>Lambda: Invoke AuthLambda
    Lambda->>DB: Check if user exists
    DB-->>Lambda: No user found
    Lambda->>Lambda: Hash password (SHA-256)
    Lambda->>DB: Create user record
    Lambda->>Lambda: Generate JWT tokens
    Lambda-->>API: Return tokens
    API-->>Frontend: 200 OK + tokens
    
    Frontend->>Frontend: Store access_token in localStorage
    Frontend->>API: GET /api/auth/me<br/>(with token)
    API->>Lambda: Validate JWT
    Lambda->>DB: Get user data
    DB-->>Lambda: User profile
    Lambda-->>API: User data
    API-->>Frontend: User profile
    
    Frontend->>Frontend: Set user state
    Frontend->>Browser: Redirect to /dashboard
    Browser-->>User: Show Dashboard
    
    Note over User,DB: Login Flow
    
    User->>Browser: Clicks "Sign In"
    Browser->>Frontend: Navigate to /login
    User->>Frontend: Enter email, password
    
    Frontend->>API: POST /api/auth/login
    API->>Lambda: Invoke AuthLambda
    Lambda->>DB: Get user by email
    DB-->>Lambda: User record
    Lambda->>Lambda: Verify password hash
    Lambda->>Lambda: Generate JWT tokens
    Lambda-->>API: Return tokens
    API-->>Frontend: 200 OK + tokens
    
    Frontend->>Frontend: Store tokens
    Frontend->>API: GET /api/auth/me
    API-->>Frontend: User profile
    Frontend->>Frontend: Set user state
    Frontend->>Browser: Redirect to /dashboard
    Browser-->>User: Show Dashboard
    
    Note over User,DB: Protected Page Access
    
    User->>Browser: Refresh page (F5)
    Browser->>Frontend: Reload page
    Frontend->>Frontend: Check localStorage for token
    
    alt Token exists
        Frontend->>API: GET /api/auth/me<br/>(with token)
        API->>Lambda: Validate JWT
        Lambda->>DB: Get user
        DB-->>Lambda: User data
        Lambda-->>API: User profile
        API-->>Frontend: User profile
        Frontend->>Frontend: Set user state
        Frontend-->>User: Show page content
    else No token or invalid
        Frontend->>Browser: Redirect to /login
        Browser-->>User: Show Login page
    end
```

---

## **3. Code Editor Flow**

```mermaid
graph TB
    Start([User Opens Editor]) --> Load[Load Editor Page]
    
    Load --> CheckRoom{Room ID<br/>in URL?}
    CheckRoom -->|Yes| UseRoom[Use Existing Room]
    CheckRoom -->|No| GenRoom[Generate Random Room ID]
    
    UseRoom --> FetchCode[Fetch Code from DB]
    GenRoom --> DefaultCode[Load Default Code]
    
    FetchCode --> InitEditor[Initialize Monaco Editor]
    DefaultCode --> InitEditor
    
    InitEditor --> ConnectWS[Connect WebSocket]
    ConnectWS --> WSSuccess{Connection<br/>Success?}
    
    WSSuccess -->|Yes| ShowConnected[Show Green Badge]
    WSSuccess -->|No| ShowDisconnected[Show Red Badge]
    
    ShowConnected --> Ready[Editor Ready]
    ShowDisconnected --> Ready
    
    Ready --> UserAction{User Action}
    
    UserAction -->|Types Code| TypeCode[Code Change Event]
    TypeCode --> BroadcastCode[Broadcast via WebSocket]
    BroadcastCode --> UpdateRemote[Update Other Users]
    UpdateRemote --> UserAction
    
    UserAction -->|Moves Cursor| CursorMove[Cursor Position Event]
    CursorMove --> BroadcastCursor[Send Cursor Data]
    BroadcastCursor --> ShowCursor[Show Remote Cursors]
    ShowCursor --> UserAction
    
    UserAction -->|Clicks Run| RunCode[Execute Code]
    RunCode --> DetectLang{Language?}
    DetectLang -->|Python| ExecPython[Python Lambda]
    DetectLang -->|JavaScript| ExecJS[JS Lambda]
    ExecPython --> ShowOutput[Display Output Console]
    ExecJS --> ShowOutput
    ShowOutput --> UserAction
    
    UserAction -->|Clicks Save| SaveCode[Save to DynamoDB]
    SaveCode --> IncVersion[Increment Version]
    IncVersion --> ShowSaved[Show "Saved!" Message]
    ShowSaved --> UserAction
    
    UserAction -->|Clicks History| OpenHistory[Open Version Modal]
    OpenHistory --> FetchVersions[Get All Versions]
    FetchVersions --> DisplayVersions[Display Version List]
    DisplayVersions --> SelectVersion{User Selects<br/>Version?}
    SelectVersion -->|Yes| RestoreVersion[Load Selected Version]
    SelectVersion -->|No| CloseModal[Close Modal]
    RestoreVersion --> UpdateEditor[Update Editor Content]
    UpdateEditor --> UserAction
    CloseModal --> UserAction
    
    UserAction -->|Clicks Chat| OpenChat[Open Chat Sidebar]
    OpenChat --> TypeMsg[User Types Message]
    TypeMsg --> SendMsg[Send via WebSocket]
    SendMsg --> BroadcastMsg[Broadcast to Room]
    BroadcastMsg --> ShowMsg[Display in All Chats]
    ShowMsg --> UserAction
    
    UserAction -->|Clicks AI Analyze| StartAI[Start AI Analysis]
    StartAI --> AnalyzeCode[Analyze Code Syntax]
    AnalyzeCode --> ShowSuggestion[Show AI Suggestion]
    ShowSuggestion --> UserAction
    
    UserAction -->|Clicks Copy Link| CopyLink[Copy Room URL]
    CopyLink --> Clipboard[Write to Clipboard]
    Clipboard --> ShowCopied[Show "Copied!" Message]
    ShowCopied --> UserAction
    
    UserAction -->|Clicks Dashboard| GoBack[Navigate to Dashboard]
    GoBack --> End([Exit Editor])
    
    style Start fill:#e8f5e9
    style Ready fill:#fff4e1
    style UserAction fill:#e1f5ff
    style End fill:#ffebee
```

---

## **4. Multi-User Real-Time Collaboration**

```mermaid
sequenceDiagram
    participant U1 as User 1 Browser
    participant U2 as User 2 Browser
    participant WS as WebSocket API
    participant Handler as Message Handler
    participant DB as Connections DB

    Note over U1,DB: User 1 Joins Room
    
    U1->>WS: Connect (roomId: demo-123, username: Alice)
    WS->>Handler: $connect event
    Handler->>DB: Store connectionId1 → roomId: demo-123
    Handler->>WS: Send user_joined event
    WS->>U1: {type: "user_joined", username: "Alice"}
    U1->>U1: Update UI: Active Users: 1
    
    Note over U1,DB: User 2 Joins Same Room
    
    U2->>WS: Connect (roomId: demo-123, username: Bob)
    WS->>Handler: $connect event
    Handler->>DB: Store connectionId2 → roomId: demo-123
    Handler->>DB: Query all connections in demo-123
    DB-->>Handler: [connectionId1, connectionId2]
    Handler->>WS: Broadcast user_joined to all
    WS->>U1: {type: "user_joined", username: "Bob"}
    WS->>U2: {type: "user_joined", username: "Alice"}
    U1->>U1: Update UI: Active Users: 2
    U2->>U2: Update UI: Active Users: 2
    
    Note over U1,DB: User 1 Types Code
    
    U1->>U1: Types: console.log("Hello")
    U1->>WS: {action: "code_change", code: "console.log('Hello')"}
    WS->>Handler: $message event
    Handler->>DB: Query connections in demo-123
    DB-->>Handler: [connectionId1, connectionId2]
    Handler->>Handler: Exclude sender (connectionId1)
    Handler->>WS: Post to connectionId2
    WS->>U2: {type: "code_update", code: "console.log('Hello')"}
    U2->>U2: Update editor content
    
    Note over U1,DB: User 2 Sends Chat Message
    
    U2->>U2: Types chat: "Great code!"
    U2->>WS: {action: "chat_message", message: "Great code!"}
    WS->>Handler: $message event
    Handler->>DB: Query connections in demo-123
    DB-->>Handler: [connectionId1, connectionId2]
    Handler->>WS: Broadcast to all in room
    WS->>U1: {type: "chat_message", username: "Bob", message: "Great code!"}
    WS->>U2: {type: "chat_message", username: "Bob", message: "Great code!"}
    U1->>U1: Display message in chat
    U2->>U2: Display message in chat
    
    Note over U1,DB: User 1 Moves Cursor
    
    U1->>U1: Moves cursor to line 5
    U1->>WS: {action: "cursor_move", line: 5, column: 10}
    WS->>Handler: $message event
    Handler->>WS: Post to connectionId2
    WS->>U2: {type: "cursor_update", username: "Alice", line: 5, column: 10}
    U2->>U2: Show remote cursor indicator
    
    Note over U1,DB: User 2 Leaves
    
    U2->>WS: Disconnect
    WS->>Handler: $disconnect event
    Handler->>DB: Delete connectionId2
    Handler->>DB: Query remaining connections in demo-123
    DB-->>Handler: [connectionId1]
    Handler->>WS: Broadcast user_left
    WS->>U1: {type: "user_left", username: "Bob"}
    U1->>U1: Update UI: Active Users: 1
```

---

## **5. Code Execution Flow**

```mermaid
graph TB
    Start([User Clicks Run Code]) --> Validate{Validate<br/>Code?}
    
    Validate -->|Empty| ShowError[Show Error:<br/>No code to execute]
    Validate -->|Valid| CheckLang{Check<br/>Language}
    
    ShowError --> End([End])
    
    CheckLang -->|Python| PrepPython[Prepare Python Request]
    CheckLang -->|JavaScript| PrepJS[Prepare JS Request]
    CheckLang -->|Other| ShowUnsupported[Show Error:<br/>Language not supported]
    
    ShowUnsupported --> End
    
    PrepPython --> SendRequest[POST /code/execute]
    PrepJS --> SendRequest
    
    SendRequest --> Lambda{Lambda<br/>Execution}
    
    Lambda -->|Python| WritePyFile[Write code to /tmp/code.py]
    Lambda -->|JS| WriteJSFile[Write code to /tmp/code.js]
    
    WritePyFile --> RunPython[subprocess.run python3]
    WriteJSFile --> RunJS[subprocess.run node]
    
    RunPython --> Timeout{Execution<br/>Time?}
    RunJS --> Timeout
    
    Timeout -->|< 5s| Success[Capture stdout/stderr]
    Timeout -->|>= 5s| Kill[Kill process]
    
    Kill --> TimeoutError[Return timeout error]
    TimeoutError --> Cleanup
    
    Success --> CheckExit{Exit<br/>Code?}
    
    CheckExit -->|0| SuccessResult[Return success + output]
    CheckExit -->|Non-zero| ErrorResult[Return error + stderr]
    
    SuccessResult --> Cleanup[Delete temp file]
    ErrorResult --> Cleanup
    
    Cleanup --> Response[Send response to frontend]
    Response --> Display{Display in<br/>Console}
    
    Display -->|Success| GreenBorder[Green border + output]
    Display -->|Error| RedBorder[Red border + error]
    
    GreenBorder --> End
    RedBorder --> End
    
    style Start fill:#e8f5e9
    style Success fill:#c8e6c9
    style ErrorResult fill:#ffcdd2
    style TimeoutError fill:#ffcdd2
    style End fill:#e1f5ff
```

---

## **6. Version Control Flow**

```mermaid
graph TB
    Start([User Edits Code]) --> AutoSave{Auto-save<br/>Timer?}
    
    AutoSave -->|30 seconds elapsed| SaveAuto[Auto-save triggered]
    AutoSave -->|User clicks Save| SaveManual[Manual save]
    
    SaveAuto --> CheckChanges{Code<br/>Changed?}
    SaveManual --> CheckChanges
    
    CheckChanges -->|No| Skip[Skip save]
    CheckChanges -->|Yes| PrepSave[Prepare save request]
    
    Skip --> Start
    
    PrepSave --> QueryVersion[Query current version]
    QueryVersion --> GetLatest[Get latest version number]
    GetLatest --> Increment[Increment version]
    
    Increment --> SaveDB[Save to DynamoDB]
    SaveDB --> Record{Record<br/>Structure}
    
    Record --> Fields["{<br/>roomId: 'xyz',<br/>version: 3,<br/>code: '...',<br/>language: 'python',<br/>userId: 'alice',<br/>timestamp: 1789355521<br/>}"]
    
    Fields --> Stored[Stored in CodeRoomsTable]
    Stored --> ShowFeedback[Show "Saved!" message]
    ShowFeedback --> ResetTimer[Reset auto-save timer]
    ResetTimer --> Start
    
    Start -->|User clicks History| OpenHistory[Open Version History Modal]
    OpenHistory --> QueryAll[Query all versions for room]
    QueryAll --> SortDesc[Sort by version DESC]
    SortDesc --> DisplayList[Display version list]
    
    DisplayList --> UserSelect{User<br/>Selects?}
    
    UserSelect -->|Click version| LoadVersion[Load selected version]
    UserSelect -->|Close modal| CloseModal[Close modal]
    
    LoadVersion --> ReplaceCode[Replace editor content]
    ReplaceCode --> ShowRestored[Show "Version restored" message]
    ShowRestored --> CloseModal
    
    CloseModal --> Start
    
    style Start fill:#e1f5ff
    style SaveDB fill:#c8e6c9
    style LoadVersion fill:#fff4e1
```

---

## **7. Dashboard Navigation**

```mermaid
graph LR
    Dashboard[Dashboard Page] --> Header[Header Section]
    Dashboard --> Profile[Profile Card]
    Dashboard --> Stats[Quick Stats]
    Dashboard --> Actions[Quick Actions]
    Dashboard --> Activity[Recent Activity]
    
    Header --> Logo[CodeStream AI Logo]
    Header --> UserGreeting[Hello, username!]
    Header --> Logout[Logout Button]
    
    Profile --> Email[Email Address]
    Profile --> Username[Username]
    Profile --> Status[Active Badge]
    Profile --> MemberSince[Member Since Date]
    
    Stats --> Sessions[Active Sessions: 1]
    Stats --> Executions[Code Executions: 0]
    Stats --> Team[Team Members: 0]
    
    Actions --> OpenEditor[Open Editor Button]
    Actions --> SearchCode[Search Code Button]
    Actions --> Workers[Workers Button]
    Actions --> Analytics[Analytics Button]
    
    Activity --> Empty[No Recent Activity]
    Activity --> GetStarted[Get Started Button]
    
    OpenEditor -->|Click| EditorPage[Navigate to /editor]
    SearchCode -->|Click| SearchPage[Navigate to /search]
    Workers -->|Click| WorkersPage[Navigate to /workers]
    Analytics -->|Click| AnalyticsModal[Open Analytics Modal]
    Logout -->|Click| LogoutAction[Clear tokens + redirect to /]
    GetStarted -->|Click| EditorPage
    
    style Dashboard fill:#fff4e1
    style Actions fill:#e1f5ff
    style OpenEditor fill:#c8e6c9
```

---

## **8. Error Handling Flow**

```mermaid
graph TB
    Action([User Action]) --> Request[Make API Request]
    Request --> Response{Response<br/>Status?}
    
    Response -->|200 OK| Success[Process Success]
    Response -->|400 Bad Request| ClientError[Show Validation Error]
    Response -->|401 Unauthorized| AuthError[Token Invalid/Expired]
    Response -->|403 Forbidden| PermError[Show Permission Error]
    Response -->|404 Not Found| NotFound[Show Resource Not Found]
    Response -->|500 Server Error| ServerError[Show Server Error]
    Response -->|Network Error| NetworkError[Show Connection Error]
    
    Success --> UpdateUI[Update UI]
    UpdateUI --> End([End])
    
    ClientError --> ShowMsg1[Display error message]
    ShowMsg1 --> End
    
    AuthError --> ClearTokens[Clear localStorage tokens]
    ClearTokens --> RedirectLogin[Redirect to /login]
    RedirectLogin --> End
    
    PermError --> ShowMsg2[Display permission error]
    ShowMsg2 --> End
    
    NotFound --> ShowMsg3[Display 404 error]
    ShowMsg3 --> End
    
    ServerError --> ShowMsg4[Display server error]
    ShowMsg4 --> RetryOption{Retry<br/>Option?}
    RetryOption -->|Yes| Request
    RetryOption -->|No| End
    
    NetworkError --> ShowMsg5[Display connection error]
    ShowMsg5 --> CheckInternet{Check<br/>Internet?}
    CheckInternet -->|Retry| Request
    CheckInternet -->|Cancel| End
    
    style Success fill:#c8e6c9
    style AuthError fill:#ffcdd2
    style ServerError fill:#ffcdd2
    style NetworkError fill:#fff3e0
```

---

## **Key User Flows Summary**

### **1. New User Flow**
1. Visit landing page
2. Click "Get Started"
3. Register with email/username/password
4. Automatically logged in
5. Redirected to dashboard
6. Click "Open Editor"
7. Start coding immediately

### **2. Returning User Flow**
1. Visit landing page
2. Click "Sign In"
3. Login with credentials
4. Redirected to dashboard
5. Resume work

### **3. Code Collaboration Flow**
1. User A creates room
2. User A copies room link
3. User A shares link with User B
4. User B opens link
5. User B logs in (if needed)
6. User B joins same room
7. Both users see each other's changes in real-time

### **4. Code Execution Flow**
1. Write code in editor
2. Click "Run Code"
3. Code sent to Lambda
4. Lambda executes in sandbox
5. Output returned to frontend
6. Display in console below editor

### **5. Version Control Flow**
1. Write code
2. Click "Save" or wait 30s (auto-save)
3. Version stored in DynamoDB
4. Click "History" to view versions
5. Select version to restore
6. Code loaded into editor

---

**User Experience Principles:**
- ✅ Minimal clicks to start coding (3 clicks from landing to editor)
- ✅ Real-time feedback (WebSocket updates)
- ✅ Auto-save (no lost work)
- ✅ Clear error messages
- ✅ Loading states for all actions
- ✅ Keyboard shortcuts (Ctrl+S to save)
- ✅ Responsive UI (works on all screen sizes)

**Designed for:** Collaborative coding, code sharing, real-time pair programming
