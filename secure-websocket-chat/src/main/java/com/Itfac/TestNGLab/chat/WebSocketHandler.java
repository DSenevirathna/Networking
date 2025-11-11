package com.Itfac.TestNGLab.chat;

import com.Itfac.TestNGLab.chat.models.Message;
import com.google.gson.Gson;
import io.javalin.websocket.WsContext;
import io.javalin.websocket.WsMessageContext;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Enhanced WebSocket Handler with additional features
 * - Message history
 * - Typing indicators
 * - User activity tracking
 * - Message timestamps
 * 
 * @author Member 3 - Full Stack Development
 * @version 2.0
 */
public class WebSocketHandler {
    // Thread-safe map: WsContext -> Username
    private static final Map<WsContext, String> connectedUsers = new ConcurrentHashMap<>();

    // Message history (limited to last 100 messages)
    private static final List<Message> messageHistory = Collections.synchronizedList(new ArrayList<>());
    private static final int MAX_HISTORY_SIZE = 100;

    // Typing indicators: WsContext -> timestamp
    private static final Map<WsContext, Long> typingUsers = new ConcurrentHashMap<>();

    private static final Gson gson = new Gson();
    private static final DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm:ss");

    /**
     * Called when a client connects
     */
    public static void onConnect(WsContext ctx) {
        String connectionId = UUID.randomUUID().toString();
        ctx.attribute("connectionId", connectionId);
        System.out.println("New connection: " + connectionId + " from " + ctx.session.getRemoteAddress());
    }

    /**
     * Called when a client sends a message
     */
    public static void onMessage(WsMessageContext ctx) {
        try {
            String messageJson = ctx.message();
            Message msg = gson.fromJson(messageJson, Message.class);

            if (msg == null || msg.getType() == null) {
                sendError(ctx, "Invalid message format");
                return;
            }

            switch (msg.getType()) {
                case "JOIN":
                    handleJoin(ctx, msg);
                    break;
                case "MESSAGE":
                    handleMessage(ctx, msg);
                    break;
                case "TYPING":
                    handleTyping(ctx, msg);
                    break;
                case "STOP_TYPING":
                    handleStopTyping(ctx);
                    break;
                case "WHITEBOARD_DRAW":
                    handleWhiteboardDraw(ctx, msg);
                    break;
                case "WHITEBOARD_CLEAR":
                    handleWhiteboardClear(ctx, msg);
                    break;
                default:
                    sendError(ctx, "Unknown message type: " + msg.getType());
            }
        } catch (Exception e) {
            System.err.println("Error handling message: " + e.getMessage());
            e.printStackTrace();
            sendError(ctx, "Server error processing message");
        }
    }

    /**
     * Handle user joining the chat
     */
    private static void handleJoin(WsContext ctx, Message msg) {
        String username = msg.getPayload().getUsername();
        if (username == null || username.isBlank()) {
            sendError(ctx, "Username cannot be empty");
            return;
        }

        // Check if username is already taken
        if (connectedUsers.containsValue(username)) {
            sendError(ctx, "Username '" + username + "' is already taken");
            return;
        }

        // Register user
        connectedUsers.put(ctx, username);
        System.out.println(username + " joined the chat (Total users: " + connectedUsers.size() + ")");

        // Send message history to the new user
        sendMessageHistory(ctx);

        // Broadcast user list update
        broadcastUserList();

        // Broadcast join notification
        Message joinMsg = createSystemMessage(username + " joined the chat");
        broadcastAndSave(joinMsg, null);
    }

    /**
     * Handle chat message
     */
    private static void handleMessage(WsContext ctx, Message msg) {
        String username = connectedUsers.get(ctx);
        if (username == null) {
            sendError(ctx, "Please join the chat first");
            return;
        }

        String text = msg.getPayload().getText();
        if (text == null || text.isBlank()) {
            return; // Ignore empty messages
        }

        // Create message with timestamp
        Message broadcastMsg = new Message("MESSAGE",
                new Message.Payload(username, text));
        broadcastMsg.setTimestamp(LocalDateTime.now().format(timeFormatter));

        broadcastAndSave(broadcastMsg, null);
    }

    /**
     * Handle typing indicator
     */
    private static void handleTyping(WsContext ctx, Message msg) {
        String username = connectedUsers.get(ctx);
        if (username == null)
            return;

        typingUsers.put(ctx, System.currentTimeMillis());

        // Broadcast typing indicator
        Message typingMsg = new Message("TYPING",
                new Message.Payload(username, null));
        broadcast(gson.toJson(typingMsg), ctx);
    }

    /**
     * Handle stop typing indicator
     */
    private static void handleStopTyping(WsContext ctx) {
        String username = connectedUsers.get(ctx);
        if (username == null)
            return;

        typingUsers.remove(ctx);

        // Broadcast stop typing indicator
        Message stopTypingMsg = new Message("STOP_TYPING",
                new Message.Payload(username, null));
        broadcast(gson.toJson(stopTypingMsg), ctx);
    }

    /**
     * Handle whiteboard drawing data
     */
    private static void handleWhiteboardDraw(WsMessageContext ctx, Message msg) {
        String username = connectedUsers.get(ctx);
        if (username == null) {
            sendError(ctx, "Please join the chat first");
            return;
        }

        // Broadcast drawing data to all other clients
        broadcast(gson.toJson(msg), ctx);
    }

    /**
     * Handle whiteboard clear request
     */
    private static void handleWhiteboardClear(WsMessageContext ctx, Message msg) {
        String username = connectedUsers.get(ctx);
        if (username == null) {
            sendError(ctx, "Please join the chat first");
            return;
        }

        // Broadcast clear command to all clients
        broadcast(gson.toJson(msg), null); // Include the sender
    }

    /**
     * Called when a client disconnects
     */
    public static void onClose(WsContext ctx) {
        String username = connectedUsers.remove(ctx);
        typingUsers.remove(ctx);

        if (username != null) {
            System.out.println(username + " left the chat (Remaining: " + connectedUsers.size() + ")");

            // Broadcast user list update
            broadcastUserList();

            // Broadcast leave notification
            Message leaveMsg = createSystemMessage(username + " left the chat");
            broadcastAndSave(leaveMsg, ctx);
        }
    }

    /**
     * Broadcast message to all connected clients and save to history
     */
    private static void broadcastAndSave(Message message, WsContext exclude) {
        // Save to history
        saveToHistory(message);

        // Broadcast to all clients
        broadcast(gson.toJson(message), exclude);
    }

    /**
     * Broadcast message to all connected clients
     */
    public static void broadcast(String message, WsContext exclude) {
        List<WsContext> clients = new ArrayList<>(connectedUsers.keySet());
        for (WsContext client : clients) {
            try {
                if (client != exclude && client.session.isOpen()) {
                    client.send(message);
                }
            } catch (Exception e) {
                System.err.println("Error sending to client: " + e.getMessage());
            }
        }
    }

    /**
     * Broadcast updated user list
     */
    private static void broadcastUserList() {
        List<String> usernames = new ArrayList<>(connectedUsers.values());

        Message.Payload payload = new Message.Payload();
        payload.setUsers(usernames.toArray(new String[0]));

        Message userListMsg = new Message("USER_LIST_UPDATE", payload);
        broadcast(gson.toJson(userListMsg), null);
    }

    /**
     * Send message history to a specific client
     */
    private static void sendMessageHistory(WsContext ctx) {
        synchronized (messageHistory) {
            for (Message msg : messageHistory) {
                try {
                    ctx.send(gson.toJson(msg));
                } catch (Exception e) {
                    System.err.println("Error sending history: " + e.getMessage());
                }
            }
        }
    }

    /**
     * Save message to history with size limit
     */
    private static void saveToHistory(Message message) {
        synchronized (messageHistory) {
            messageHistory.add(message);
            // Keep only last MAX_HISTORY_SIZE messages
            while (messageHistory.size() > MAX_HISTORY_SIZE) {
                messageHistory.remove(0);
            }
        }
    }

    /**
     * Create a system message
     */
    private static Message createSystemMessage(String text) {
        Message msg = new Message("SYSTEM", new Message.Payload(null, text));
        msg.setTimestamp(LocalDateTime.now().format(timeFormatter));
        return msg;
    }

    /**
     * Send error message to a specific client
     */
    private static void sendError(WsContext ctx, String errorText) {
        try {
            Message errorMsg = new Message("ERROR", new Message.Payload(null, errorText));
            ctx.send(gson.toJson(errorMsg));
        } catch (Exception e) {
            System.err.println("Error sending error message: " + e.getMessage());
        }
    }

    /**
     * Called on error
     */
    public static void onError(WsContext ctx, Throwable throwable) {
        System.err.println("WebSocket error: " + throwable.getMessage());
        throwable.printStackTrace();
    }

    /**
     * Get connected users count (for monitoring)
     */
    public static int getConnectedUsersCount() {
        return connectedUsers.size();
    }

    /**
     * Get message history size (for monitoring)
     */
    public static int getMessageHistorySize() {
        return messageHistory.size();
    }
}
