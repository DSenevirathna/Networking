# Distributed Services Hub - Implementation Plan

## Evolution from Chat Application to Microservices Architecture

**Date:** November 10, 2025  
**Project:** Network Programming Group Assignment - 5 Person Team  
**Current Status:** Existing chat application (WebSocket + SSL + NIO file transfer) ready for refactoring

---

## 1. PROJECT OVERVIEW & ARCHITECTURE TRANSFORMATION

### Current State

- ✅ **Secure WebSocket Chat Server** (Java, port 7070/7443)
  - Uses Javalin framework with SSL/TLS support
  - Handles multiple concurrent WebSocket connections
  - Basic file upload/download with NIO
  - Message history and user management
- ✅ **React Frontend Dashboard**
  - Modern UI for chat application
  - WebSocket client with SSL support
  - File upload modal functionality
  - Real-time user list updates

### Target State

**Distributed Services Hub** with the following components:

```
┌─────────────────────────────────────────────────────────────┐
│                    THE HUB (Central Registry)                │
│  ├─ Service Registry (TCP Server + Concurrency)             │
│  ├─ Heartbeat Monitor (30-second timeout)                   │
│  ├─ WebSocket Broadcaster (Sends service updates)           │
│  └─ RESTful API (Service status, statistics)                │
└────┬─────────────────────────────────────────────────────────┘
     │
     ├── Connected to React Dashboard (Network Visualization)
     │
     ├── Connected to API Gateway Service (HttpURLConnection)
     │
     ├── Connected to Secure File Service (JSSE/SSLServerSocket)
     │
     ├── Connected to NIO Log Service (Selector-based Logging)
     │
     └── Connected to RMI Task Runner (Remote Method Invocation)
```

---

## 2. DETAILED BREAKDOWN BY MEMBER

### MEMBER 1: HUB SERVER (Multithreading & Concurrency)

**Core Concepts:** ServerSocket, Thread-per-Client, ExecutorService, ConcurrentHashMap, Heartbeat Mechanism

#### Current Code Location

- Main: `secure-websocket-chat/src/main/java/com/Itfac/TestNGLab/chat/ChatServer.java`
- Handler: `secure-websocket-chat/src/main/java/com/Itfac/TestNGLab/chat/WebSocketHandler.java`

#### Transformation Tasks

1. **Refactor ChatServer → HubServer**

   - File: Rename to `HubServer.java`
   - Keep: SSL/TLS setup, Javalin WebSocket endpoint
   - Change: Instead of handling chat messages, handle service REGISTER/DEREGISTER/HEARTBEAT messages
   - Port: Remain at 7070/7443

2. **Define Hub Protocol**

   ```
   Message Format: TYPE::ServiceName::Host::Port[::Metadata]

   Types:
   - REGISTER::ApiGateway::localhost::9001
   - DEREGISTER::ApiGateway
   - HEARTBEAT::ApiGateway
   - FETCH_SERVICES (to get all registered services)
   ```

3. **Service Registry Data Structure**

   ```java
   public class ServiceRegistry {
       // ConcurrentHashMap<ServiceName, ServiceInfo>
       // ServiceInfo: {name, host, port, status, lastHeartbeat, metadata}
       // MUST use ConcurrentHashMap for thread-safety (Lesson 6)
   }
   ```

4. **Thread Pool for Service Connections**

   - Use `ExecutorService` (Lesson 6) instead of one thread per service
   - Recommended: `Executors.newFixedThreadPool(20)` or `newCachedThreadPool()`
   - Each service connection handler runs in a separate thread
   - Handler listens for HEARTBEAT/DEREGISTER messages

5. **Heartbeat Mechanism**

   - Each service must send HEARTBEAT every 10 seconds
   - Hub tracks `lastHeartbeat` timestamp for each service
   - Separate heartbeat monitor thread: Every 5 seconds, scan registry
   - If `(currentTime - lastHeartbeat) > 30 seconds`, remove service and broadcast update
   - Implementation: Use `ScheduledExecutorService` for periodic heartbeat checks

6. **WebSocket Broadcaster Enhancement**

   - When service list changes (JOIN/LEAVE/TIMEOUT), broadcast JSON to all connected dashboards:
     ```json
     {
       "type": "SERVICE_REGISTRY_UPDATE",
       "payload": {
         "services": [
           {
             "name": "ApiGateway",
             "host": "localhost",
             "port": 9001,
             "status": "online"
           },
           {
             "name": "SecureFileService",
             "host": "localhost",
             "port": 9090,
             "status": "online"
           }
         ]
       }
     }
     ```
   - Use existing `WebSocketHandler.broadcast()` mechanism or enhance it

7. **Logging & Demo Output**
   - Console should show:
     ```
     [HUB] Starting Service Registry on port 7070...
     [HUB] ApiGateway registered: localhost:9001
     [HUB] SecureFileService registered: localhost:9090
     [HUB] NioLogService registered: localhost:9091
     [HUB] TaskService (RMI) registered: rmi://localhost:1099/TaskService
     [HUB] NioLogService heartbeat timeout - DEREGISTERED
     [HUB] Broadcasting updated service list to dashboards...
     ```

#### Acceptance Criteria

- ✅ Multiple services can connect simultaneously (concurrency tested)
- ✅ Services register, heartbeat, and deregister properly
- ✅ Hub broadcasts service list changes in real-time via WebSocket
- ✅ Dashboard receives and displays service updates live
- ✅ Heartbeat timeout removes dead services automatically

---

### MEMBER 2: NETWORK DASHBOARD & API GATEWAY SERVICE

**Core Concepts:** HttpURLConnection (Lesson 5), WebSocket Client, REST API

#### Part A: React Dashboard Refactoring

**Current Code Location**

- `frontend/src/App.jsx`
- `frontend/src/components/ChatRoom.jsx`

**Transformation Tasks**

1. **Rename Chat Components → Service Components**

   - Rename component files (but keep existing ones for reference)
   - New: `ServiceDashboard.jsx` (replaces `ChatRoom.jsx`)
   - New: `ServiceRegistry.jsx` (displays active services)
   - Keep: Core WebSocket connection logic

2. **Refactor UI Purpose**

   - Old: Display chat users and messages
   - New: Display registered services and their status
   - Columns to display:
     - Service Name
     - Host:Port
     - Status (Online/Offline/Timeout)
     - Last Heartbeat
     - CPU Load (if available from RMI service)
     - Action Buttons (View Logs, Execute Task, Download File, etc.)

3. **Modify WebSocket Message Handler**

   ```jsx
   // Instead of MESSAGE, USER_LIST_UPDATE, FILE_UPLOAD
   // Handle: SERVICE_REGISTRY_UPDATE

   case 'SERVICE_REGISTRY_UPDATE':
     setServices(msg.payload.services);
     break;
   ```

4. **Add External API Query Component**
   - Button: "Fetch Weather" → Calls API Gateway Service
   - Input field for city/location
   - Display result (temperature, description, etc.)
   - Component: `ExternalDataFetcher.jsx`

#### Part B: Java API Gateway Service

**New Java Service**

1. **Create New Module Structure**

   ```
   services/
   └── api-gateway-service/
       ├── pom.xml
       ├── src/main/java/com/example/apigateway/
       │   ├── ApiGatewayService.java (MAIN - connects to Hub)
       │   ├── HubClient.java (TCP client to Hub)
       │   ├── WebSocketServer.java (Receives commands from React)
       │   └── ExternalApiClient.java (HttpURLConnection wrapper)
       └── src/main/resources/
           └── application.properties
   ```

2. **Startup: Register with Hub**

   ```java
   // On startup:
   String registerMsg = "REGISTER::ApiGateway::localhost::9001";
   // Send to Hub on port 7070
   // Also start heartbeat thread every 10 seconds
   ```

3. **Implement HttpURLConnection Client**

   - Endpoint: Weather API (e.g., Open-Meteo free API or similar)
   - Method: `fetchWeatherData(String city) → WeatherData`
   - Use `HttpURLConnection` to:
     - Create URL connection
     - Set request method (GET)
     - Set headers (User-Agent, etc.)
     - Read response as JSON
     - Parse JSON response
   - Example:

     ```java
     URL url = new URL("https://api.open-meteo.com/v1/forecast?latitude=...");
     HttpURLConnection conn = (HttpURLConnection) url.openConnection();
     conn.setRequestMethod("GET");
     conn.setConnectTimeout(5000);
     conn.setReadTimeout(5000);

     BufferedReader reader = new BufferedReader(...);
     String response = reader.lines().collect(Collectors.joining());
     JSONObject json = new JSONObject(response);
     ```

4. **WebSocket Server for React Dashboard Commands**

   - Listen on port 9001 (announced to Hub)
   - React sends: `{"command": "fetchWeather", "city": "Colombo"}`
   - Service fetches external data, returns: `{"temperature": 28.5, "condition": "Sunny", ...}`

5. **Logging Integration**
   - Connect to Member 4's Log Service on port 9091
   - Send log messages like:
     ```
     ApiGateway: Weather fetched for Colombo (28.5°C)
     ApiGateway: HttpURLConnection successful
     ```

#### Acceptance Criteria

- ✅ React Dashboard displays all registered services in real-time
- ✅ Service status updates instantly when services join/leave
- ✅ API Gateway service appears on dashboard
- ✅ React button triggers HttpURLConnection call to external API
- ✅ Real-world data (weather) displayed on dashboard
- ✅ Logs sent to Log Service

---

### MEMBER 3: SECURE FILE SERVICE (JSSE / Secure Sockets)

**Core Concepts:** SSLServerSocket, KeyStore, JSSE (Java Secure Socket Extension)

#### Current Code Relevant

- SSL setup: `ChatServer.java` (lines: keystore configuration)
- File handling: `ApiController.java` (upload/download endpoints)

#### New Java Service

1. **Create Service Structure**

   ```
   services/
   └── secure-file-service/
       ├── pom.xml
       ├── keystore/
       │   ├── fileservice.keystore
       │   ├── fileservice.cer
       │   └── truststore
       ├── files/ (storage directory)
       ├── src/main/java/com/example/fileset/
       │   ├── SecureFileService.java (MAIN)
       │   ├── SSLFileServer.java (SSLServerSocket listener)
       │   ├── FileServiceHandler.java (Per-connection handler)
       │   ├── HubClient.java (Register with Hub)
       │   └── security/SSLUtils.java (Reuse from ChatServer)
       └── src/main/resources/ssl-config.properties
   ```

2. **Generate Self-Signed Certificate**

   - Use existing: `keystore/server.keystore` (or generate new)
   - Copy from Chat Server setup or regenerate:
     ```bash
     keytool -genkey -alias fileserver -keyalg RSA -keysize 2048 \
       -keystore keystore/fileservice.keystore -validity 365 \
       -storepass password -keypass password -dname "CN=FileServer"
     ```

3. **Implement SSLServerSocket (Not Regular ServerSocket)**

   ```java
   public class SSLFileServer {
       // Create KeyStore from file
       KeyStore keyStore = KeyStore.getInstance("JKS");
       keyStore.load(new FileInputStream("keystore/fileservice.keystore"),
                     "password".toCharArray());

       // Create SSLContext
       KeyManagerFactory kmf = KeyManagerFactory.getInstance("SunX509");
       kmf.init(keyStore, "password".toCharArray());

       SSLContext sslContext = SSLContext.getInstance("TLSv1.2");
       sslContext.init(kmf.getKeyManagers(), null, null);

       // Create SSLServerSocket on port 9090
       SSLServerSocketFactory factory = sslContext.getServerSocketFactory();
       SSLServerSocket serverSocket =
           (SSLServerSocket) factory.createServerSocket(9090);

       // Accept connections
       while (true) {
           SSLSocket socket = (SSLSocket) serverSocket.accept();
           new Thread(new FileServiceHandler(socket)).start();
       }
   }
   ```

4. **File Command Protocol**

   ```
   STORE <filename> <content>
   RETRIEVE <filename>
   LIST
   DELETE <filename>
   ```

   - Example: `STORE test.txt Hello World`
   - Example: `RETRIEVE test.txt`

5. **FileServiceHandler Implementation**

   - Read commands from SSLSocket input stream
   - Process file operations
   - Send responses back over SSL

6. **Hub Registration**

   - On startup: Send `REGISTER::SecureFileService::localhost::9090`
   - Heartbeat every 10 seconds

7. **Testing & Demo**
   - Demo 1: Show service registered on Hub
   - Demo 2: Connect with regular Socket → Connection fails ❌
   - Demo 3: Connect with SSLSocket → Connection succeeds ✅
   - Demo 4: Upload/download file securely

#### Acceptance Criteria

- ✅ Uses SSLServerSocket (NOT regular ServerSocket)
- ✅ Self-signed certificate and KeyStore properly configured
- ✅ Regular Socket client fails to connect
- ✅ SSLSocket client can store and retrieve files securely
- ✅ Service appears on Hub dashboard
- ✅ Logs sent to Log Service

---

### MEMBER 4: HIGH-PERFORMANCE LOG SERVICE (Java NIO)

**Core Concepts:** ServerSocketChannel, Selector, SocketChannel, Non-Blocking I/O (Lesson 7)

#### New Java Service

1. **Create Service Structure**

   ```
   services/
   └── nio-log-service/
       ├── pom.xml
       ├── logs/ (log output directory)
       ├── src/main/java/com/example/logservice/
       │   ├── NioLogService.java (MAIN)
       │   ├── LogServer.java (Selector-based NIO server)
       │   ├── HubClient.java (Register with Hub)
       │   └── LogWriter.java (Async file writer)
       └── src/main/resources/
   ```

2. **Implement NIO Server (NOT using Socket/ServerSocket)**

   ```java
   public class LogServer {
       private ServerSocketChannel serverSocketChannel;
       private Selector selector;

       public void start(int port) throws IOException {
           // Create ServerSocketChannel
           serverSocketChannel = ServerSocketChannel.open();
           serverSocketChannel.configureBlocking(false);
           serverSocketChannel.bind(new InetSocketAddress(port));

           // Create Selector for managing channels
           selector = Selector.open();
           serverSocketChannel.register(selector, SelectionKey.OP_ACCEPT);

           // Single-threaded event loop
           while (true) {
               selector.select(); // Block until events ready

               Set<SelectionKey> selectedKeys = selector.selectedKeys();
               Iterator<SelectionKey> it = selectedKeys.iterator();

               while (it.hasNext()) {
                   SelectionKey key = it.next();

                   if (key.isAcceptable()) {
                       handleAccept(key);
                   } else if (key.isReadable()) {
                       handleRead(key);
                   }

                   it.remove();
               }
           }
       }

       private void handleAccept(SelectionKey key) throws IOException {
           SocketChannel clientChannel =
               serverSocketChannel.accept();
           clientChannel.configureBlocking(false);
           clientChannel.register(selector, SelectionKey.OP_READ);
       }

       private void handleRead(SelectionKey key) throws IOException {
           SocketChannel channel = (SocketChannel) key.channel();
           ByteBuffer buffer = ByteBuffer.allocate(1024);

           int bytesRead = channel.read(buffer);
           if (bytesRead == -1) {
               channel.close();
               key.cancel();
           } else {
               String logMessage = new String(buffer.array(), 0, bytesRead);
               writeLogFile(logMessage);
           }
       }
   }
   ```

3. **Hub Registration**

   - On startup: Send `REGISTER::NioLogService::localhost::9091`
   - Heartbeat every 10 seconds

4. **Logging Protocol**

   - Clients connect and send log lines:
     ```
     ApiGateway: Weather fetched for Colombo (28.5°C)
     SecureFileService: File test.txt stored (1024 bytes)
     TaskService: Task calculate-pi completed
     ```

5. **Other Services Integration**

   - Member 1 (Hub): Sends registration/deregistration events
   - Member 2 (API Gateway): Sends API call logs
   - Member 3 (File Service): Sends file operation logs
   - Member 5 (Task Service): Sends task execution logs

6. **Persistent Logging**
   - Write logs to file: `logs/service.log`
   - Rotate logs daily or by size
   - Console output for demo purposes

#### Acceptance Criteria

- ✅ Uses ServerSocketChannel and Selector (NOT Socket/ServerSocket)
- ✅ Single-threaded event loop with selector.select()
- ✅ Handles multiple concurrent connections non-blocking
- ✅ Service appears on Hub dashboard
- ✅ Logs from all other services appear in real-time
- ✅ Logs persisted to file

---

### MEMBER 5: DISTRIBUTED TASK RUNNER (Java RMI)

**Core Concepts:** Remote Method Invocation (RMI), Remote Interface, RMI Registry, Remote Exceptions

#### New Java Service

1. **Create Service Structure**

   ```
   services/
   └── rmi-task-service/
       ├── pom.xml
       ├── src/main/java/com/example/taskservice/
       │   ├── TaskServiceServer.java (MAIN - starts RMI registry & binds service)
       │   ├── TaskService.java (Remote interface, extends Remote)
       │   ├── TaskServiceImpl.java (Implementation)
       │   ├── HubClient.java (Register with Hub)
       │   └── client/
       │       ├── TaskClient.java (CLI client to invoke remote methods)
       │       └── TaskResult.java (Result object)
       └── src/main/resources/
   ```

2. **Define Remote Interface**

   ```java
   import java.rmi.Remote;
   import java.rmi.RemoteException;

   public interface TaskService extends Remote {
       String executeTask(String taskName) throws RemoteException;
       int getCpuLoad() throws RemoteException;
       String getStatus() throws RemoteException;
       List<String> getAvailableTasks() throws RemoteException;
   }
   ```

3. **Implement Remote Service**

   ```java
   import java.rmi.RemoteException;
   import java.rmi.server.UnicastRemoteObject;

   public class TaskServiceImpl
       extends UnicastRemoteObject
       implements TaskService {

       public TaskServiceImpl() throws RemoteException {
           super();
       }

       @Override
       public String executeTask(String taskName) throws RemoteException {
           System.out.println("Remote call: executeTask(" + taskName + ")");

           if ("calculate-pi".equals(taskName)) {
               return "Pi = 3.14159265358979...";
           } else if ("fibonacci-10".equals(taskName)) {
               return "55";
           }
           return "Unknown task";
       }

       @Override
       public int getCpuLoad() throws RemoteException {
           return (int) (ManagementFactory
               .getOperatingSystemMXBean()
               .getProcessCpuLoad() * 100);
       }

       @Override
       public String getStatus() throws RemoteException {
           return "Task Service: Running";
       }

       @Override
       public List<String> getAvailableTasks() throws RemoteException {
           return Arrays.asList(
               "calculate-pi",
               "fibonacci-10",
               "matrix-multiply",
               "prime-check"
           );
       }
   }
   ```

4. **Start RMI Registry & Bind Service**

   ```java
   public class TaskServiceServer {
       public static void main(String[] args) {
           try {
               // Start RMI registry on port 1099
               Registry registry = LocateRegistry.createRegistry(1099);

               // Create and bind service
               TaskService service = new TaskServiceImpl();
               registry.rebind("TaskService", service);

               System.out.println("TaskService bound and ready on rmi://localhost:1099/TaskService");

               // Register with Hub
               registerWithHub();

               // Keep running
               Thread.currentThread().join();
           } catch (Exception e) {
               e.printStackTrace();
           }
       }

       private static void registerWithHub() throws IOException {
           String registerMsg = "REGISTER::TaskService::rmi://localhost::1099/TaskService";
           Socket socket = new Socket("localhost", 7070);
           PrintWriter out = new PrintWriter(socket.getOutputStream());
           out.println(registerMsg);
           out.flush();
           socket.close();
       }
   }
   ```

5. **Implement RMI Client**

   ```java
   public class TaskClient {
       public static void main(String[] args) {
           try {
               // Look up service in registry
               Registry registry =
                   LocateRegistry.getRegistry("localhost", 1099);
               TaskService service =
                   (TaskService) registry.lookup("TaskService");

               // Invoke remote methods
               System.out.println("Available tasks: "
                   + service.getAvailableTasks());
               System.out.println("CPU Load: "
                   + service.getCpuLoad() + "%");
               System.out.println("Execute calculate-pi: "
                   + service.executeTask("calculate-pi"));

           } catch (Exception e) {
               e.printStackTrace();
           }
       }
   }
   ```

6. **Hub Registration**
   - Send: `REGISTER::TaskService::rmi://localhost:1099/TaskService`
   - Heartbeat every 10 seconds

#### Acceptance Criteria

- ✅ Proper Remote interface extending `java.rmi.Remote`
- ✅ RMI registry started and service bound
- ✅ RMI client can successfully invoke remote methods
- ✅ Remote exceptions properly handled
- ✅ Service appears on Hub dashboard
- ✅ Remote method calls work across network
- ✅ Logs sent to Log Service

---

## 3. IMPLEMENTATION PHASES & TIMELINE

### Phase 1: Hub Server Refactoring (Member 1)

**Duration:** 3-4 days  
**Dependencies:** None (Independent start)

- [ ] Refactor ChatServer → HubServer
- [ ] Implement ConcurrentHashMap service registry
- [ ] Create service registration protocol
- [ ] Implement heartbeat monitor (ScheduledExecutorService)
- [ ] Deploy heartbeat detection and timeout mechanism
- [ ] Enhance WebSocket broadcaster for service updates
- [ ] Test with mock services
- [ ] Complete logging output

**Deliverable:** Working Hub server accepting service registrations

### Phase 2: API Gateway Service (Member 2 - Part B)

**Duration:** 3-4 days  
**Dependencies:** Hub server (Phase 1)

- [ ] Create API Gateway service module
- [ ] Implement HubClient to register with Hub
- [ ] Implement heartbeat mechanism
- [ ] Implement HttpURLConnection to external API
- [ ] Create WebSocket endpoint for React commands
- [ ] Test HTTP calls to external API
- [ ] Integrate with Log Service (once ready)

**Deliverable:** API Gateway service fetching real-world data

### Phase 3: React Dashboard Refactoring (Member 2 - Part A)

**Duration:** 2-3 days  
**Dependencies:** Hub server (Phase 1)

- [ ] Refactor Chat components to Service components
- [ ] Update WebSocket message handlers
- [ ] Create service registry display UI
- [ ] Add external API fetcher component
- [ ] Connect to Hub for service updates
- [ ] Style dashboard UI
- [ ] Test real-time updates

**Deliverable:** Working dashboard displaying services

### Phase 4: Secure File Service (Member 3)

**Duration:** 4-5 days  
**Dependencies:** Hub server, Log Service (Phase 5)

- [ ] Create service module structure
- [ ] Generate self-signed certificate and KeyStore
- [ ] Implement SSLServerSocket server
- [ ] Create FileServiceHandler for protocols
- [ ] Implement file storage logic
- [ ] Create test SSL client
- [ ] Implement HubClient registration
- [ ] Integrate logging

**Deliverable:** Secure file storage and retrieval over SSL

### Phase 5: NIO Log Service (Member 4)

**Duration:** 4-5 days  
**Dependencies:** Hub server (Phase 1)

- [ ] Create service module structure
- [ ] Implement ServerSocketChannel + Selector
- [ ] Create non-blocking event loop
- [ ] Implement HubClient registration
- [ ] Create log file writer
- [ ] Test with multiple concurrent connections
- [ ] Integrate with all other services

**Deliverable:** High-performance logging service

### Phase 6: RMI Task Service (Member 5)

**Duration:** 3-4 days  
**Dependencies:** Hub server, Log Service

- [ ] Create service module structure
- [ ] Define TaskService remote interface
- [ ] Implement TaskServiceImpl
- [ ] Start RMI registry and bind service
- [ ] Create RMI client
- [ ] Implement HubClient registration
- [ ] Test remote method invocation
- [ ] Integrate logging

**Deliverable:** Working RMI service with remote method calls

### Phase 7: Integration & Testing (All Members)

**Duration:** 2-3 days  
**Dependencies:** All services (Phases 1-6)

- [ ] Start Hub server
- [ ] Start all microservices one by one
- [ ] Verify all registrations on Hub
- [ ] Verify React dashboard shows all services
- [ ] Test API Gateway external API calls
- [ ] Test Secure File Service upload/download
- [ ] Verify all logs appear in Log Service
- [ ] Test RMI client remote method invocation
- [ ] Perform end-to-end integration testing
- [ ] Prepare demo and documentation

**Deliverable:** Fully integrated system ready for presentation

---

## 4. DIRECTORY STRUCTURE (After Implementation)

```
network programming - assignment/
├── frontend/                          (React Dashboard - Refactored)
│   ├── src/components/
│   │   ├── ServiceRegistry.jsx
│   │   ├── ServiceDashboard.jsx
│   │   ├── ExternalDataFetcher.jsx
│   │   └── ...
│   └── ...
│
├── services/
│   ├── hub-server/                    (Member 1)
│   │   ├── pom.xml
│   │   ├── src/main/java/com/example/hub/
│   │   │   ├── HubServer.java
│   │   │   ├── ServiceRegistry.java
│   │   │   ├── ServiceRegistryHandler.java
│   │   │   ├── HeartbeatMonitor.java
│   │   │   └── security/SSLUtils.java
│   │   └── ...
│   │
│   ├── api-gateway-service/           (Member 2)
│   │   ├── pom.xml
│   │   ├── src/main/java/com/example/apigateway/
│   │   │   ├── ApiGatewayService.java
│   │   │   ├── HubClient.java
│   │   │   ├── WebSocketServer.java
│   │   │   ├── ExternalApiClient.java (HttpURLConnection)
│   │   │   └── ...
│   │   └── ...
│   │
│   ├── secure-file-service/           (Member 3)
│   │   ├── pom.xml
│   │   ├── keystore/
│   │   │   ├── fileservice.keystore
│   │   │   └── fileservice.cer
│   │   ├── files/ (storage)
│   │   ├── src/main/java/com/example/fileservice/
│   │   │   ├── SecureFileService.java
│   │   │   ├── SSLFileServer.java
│   │   │   ├── FileServiceHandler.java
│   │   │   ├── HubClient.java
│   │   │   └── security/SSLUtils.java
│   │   └── ...
│   │
│   ├── nio-log-service/               (Member 4)
│   │   ├── pom.xml
│   │   ├── logs/ (output)
│   │   ├── src/main/java/com/example/logservice/
│   │   │   ├── NioLogService.java
│   │   │   ├── LogServer.java (Selector-based)
│   │   │   ├── HubClient.java
│   │   │   └── LogWriter.java
│   │   └── ...
│   │
│   └── rmi-task-service/              (Member 5)
│       ├── pom.xml
│       ├── src/main/java/com/example/taskservice/
│       │   ├── TaskServiceServer.java
│       │   ├── TaskService.java (Remote interface)
│       │   ├── TaskServiceImpl.java
│       │   ├── HubClient.java
│       │   └── client/
│       │       ├── TaskClient.java
│       │       └── TaskResult.java
│       └── ...
│
├── IMPLEMENTATION_PLAN.md           (This file)
├── START_SERVICES.md                 (Startup guide - to be created)
├── API_DOCUMENTATION.md              (Protocol documentation - to be created)
└── DEMO_GUIDE.md                     (Presentation guide - to be created)
```

---

## 5. KEY IMPLEMENTATION GUIDELINES

### General Requirements for All Services

1. **Hub Registration on Startup**

   ```java
   String registerMessage = "REGISTER::" + serviceName + "::" + host + "::" + port;
   // Send to Hub on port 7070 via TCP Socket
   ```

2. **Heartbeat Every 10 Seconds**

   ```java
   ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
   scheduler.scheduleAtFixedRate(() -> {
       String heartbeat = "HEARTBEAT::" + serviceName;
       // Send to Hub on port 7070
   }, 0, 10, TimeUnit.SECONDS);
   ```

3. **Logging to Log Service on port 9091**

   ```java
   // All services should connect to Log Service and send logs
   Socket logSocket = new Socket("localhost", 9091);
   PrintWriter logWriter = new PrintWriter(logSocket.getOutputStream(), true);
   logWriter.println("ServiceName: Log message here");
   ```

4. **Graceful Shutdown**
   ```java
   Runtime.getRuntime().addShutdownHook(new Thread(() -> {
       // Send DEREGISTER message to Hub
       // Close all connections
       // Write final log entry
   }));
   ```

### Member 1 (Hub) Specific

- Use `ConcurrentHashMap` for thread-safety
- Use `ExecutorService` for managing service connections
- Use `ScheduledExecutorService` for heartbeat monitor
- Broadcast service list as JSON via WebSocket
- Handle multiple concurrent service connections

### Member 2 (API Gateway) Specific

- Use `HttpURLConnection` for external API calls (NOT Retrofit, OkHttp, etc.)
- Handle JSON parsing from external API
- Create WebSocket endpoint for React commands
- Implement proper error handling for network calls

### Member 3 (Secure File Service) Specific

- Use `SSLServerSocket` (NOT regular ServerSocket)
- Proper KeyStore and KeyManager configuration
- Verify client certificates if required
- Implement file storage with proper permissions

### Member 4 (Log Service) Specific

- Use `ServerSocketChannel` and `Selector` (NOT ServerSocket)
- Single-threaded event loop with `selector.select()`
- Non-blocking read/write operations
- Persistent log file output

### Member 5 (RMI Service) Specific

- Extend `UnicastRemoteObject` for automatic serialization
- Implement proper `Remote` interface with `RemoteException` throws
- Use `LocateRegistry` for registry operations
- Implement proper shutdown in RMI registry

---

## 6. TESTING STRATEGY

### Unit Testing

- Each service tested independently
- Mock Hub for service testing
- Test protocol parsing and handling

### Integration Testing

- Start Hub first
- Start each service and verify registration
- Verify heartbeat mechanism
- Test service timeout detection
- Test concurrent operations

### End-to-End Testing

- Start all services
- React Dashboard displays all services
- API Gateway fetches external data
- File upload/download via Secure File Service
- All logs appear in Log Service
- RMI client calls remote methods
- Service timeout and recovery

### Demo Scenarios

1. Hub startup and dashboard initialization
2. API Gateway registers and fetches weather
3. Secure File Service stores/retrieves files securely
4. Log Service displays concurrent logs from all services
5. RMI Task Service executes remote tasks
6. Service timeout and automatic deregistration
7. Service recovery and re-registration

---

## 7. DEPLOYMENT CHECKLIST

Before presentation:

- [ ] All services build successfully with Maven
- [ ] No compilation errors or warnings
- [ ] All dependencies properly defined in pom.xml
- [ ] Keystore/SSL certificates generated and valid
- [ ] Logging properly configured in all services
- [ ] Demo scripts prepared and tested
- [ ] Documentation complete
- [ ] GitHub repository updated with all code
- [ ] Each member can independently run their service
- [ ] System works with all services running together

---

## 8. DOCUMENTATION TO CREATE

1. **START_SERVICES.md** - Step-by-step guide to start each service
2. **API_DOCUMENTATION.md** - Protocol specification for service communication
3. **DEMO_GUIDE.md** - Presentation walkthrough
4. **TROUBLESHOOTING.md** - Common issues and solutions
5. **SERVICE_README.md** (each service folder) - Service-specific documentation

---

## 9. MIGRATION FROM EXISTING CODE

### What to Keep

- ✅ SSL/TLS infrastructure (ChatServer)
- ✅ WebSocket foundation (Javalin)
- ✅ File handling with NIO (ApiController)
- ✅ React UI structure
- ✅ Error handling patterns

### What to Refactor

- ⚠️ WebSocketHandler → ServiceRegistryHandler (not chat messages, but service events)
- ⚠️ ChatRoom.jsx → ServiceDashboard.jsx
- ⚠️ Remove chat-specific logic

### What to Create New

- 🆕 HubServer core functionality
- 🆕 4 Independent microservices
- 🆕 Service registration protocol
- 🆕 Heartbeat mechanism
- 🆕 HttpURLConnection wrapper
- 🆕 SSLServerSocket file server
- 🆕 Selector-based NIO log server
- 🆕 RMI service with remote interface

---

## SUMMARY

This Distributed Services Hub architecture transforms a simple chat application into a production-like microservices demonstration system. Each member focuses on one key networking concept:

- **Member 1:** Multithreading & Concurrency (Hub)
- **Member 2:** HttpURLConnection & WebSockets (API Gateway)
- **Member 3:** JSSE & Secure Sockets (File Service)
- **Member 4:** Java NIO & Selectors (Log Service)
- **Member 5:** Java RMI (Task Service)

The system is **scalable, professional, and demonstrates real-world distributed computing patterns** suitable for both academic and portfolio purposes.

---

**Next Steps:** Share this plan with team members and begin Phase 1 implementation.
