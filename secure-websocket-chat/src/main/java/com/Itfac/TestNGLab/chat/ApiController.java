package com.Itfac.TestNGLab.chat;

import io.javalin.Javalin;
import io.javalin.http.UploadedFile;

import java.io.*;
import java.lang.management.ManagementFactory;
import java.net.URLEncoder;
import java.nio.ByteBuffer;
import java.nio.channels.Channels;
import java.nio.channels.FileChannel;
import java.nio.channels.ReadableByteChannel;
import java.nio.channels.WritableByteChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import com.Itfac.TestNGLab.chat.models.Message;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

public class ApiController {
    // In-memory map: unique filename → original filename
    private static final Map<String, String> fileNameMap = new ConcurrentHashMap<>();

    private static final ObjectMapper objectMapper = new ObjectMapper();

    // Register REST endpoints to existing Javalin app
    public static void registerRoutes(Javalin app) {

        /* ---- 1. Server Status API ---- */
        app.get("/status", ctx -> {
            ctx.json(Map.of(
                    "server", "Chat Server",
                    "status", "Running OK",
                    "port", 7070,
                    "connectedUsers", WebSocketHandler.getConnectedUsersCount(),
                    "messageHistory", WebSocketHandler.getMessageHistorySize(),
                    "sslEnabled", System.getProperty("ssl.enabled", "false")));
        });

        /* ---- 2. Statistics API ---- */
        app.get("/stats", ctx -> {
            ctx.json(Map.of(
                    "connectedUsers", WebSocketHandler.getConnectedUsersCount(),
                    "messageHistorySize", WebSocketHandler.getMessageHistorySize(),
                    "uptime", ManagementFactory.getRuntimeMXBean().getUptime(),
                    "timestamp", System.currentTimeMillis()));
        });

        // 3. File Upload API (Performance Engineer Version using NIO)
        app.post("/upload", ctx -> {
            // Step 1: Retrieve uploaded file and username
            List<UploadedFile> files = ctx.uploadedFiles("file");
            String username = ctx.formParam("username");

            if (files.isEmpty()) {
                ctx.status(400).result("No file uploaded!");
                return;
            }

            if (username == null || username.trim().isEmpty()) {
                ctx.status(400).result("Username is required and cannot be empty.");
                return;
            }

            UploadedFile file = files.get(0);
            String uploadDir = "uploads/";
            final long MAX_FILE_SIZE = 5L * 1024L * 1024L; // 5 MB

            try {
                // Step 2: Ensure upload directory exists
                Files.createDirectories(Paths.get(uploadDir));

                // Step 3: Sanitize and prepare file name
                String originalName = file.filename();
                String safeName = (originalName == null)
                        ? "file"
                        : Paths.get(originalName).getFileName().toString();
                safeName = safeName.replaceAll("[^A-Za-z0-9._-]", "_");
                if (safeName.length() > 100)
                    safeName = safeName.substring(0, 100);

                // Step 4: Construct final destination path
                String uniqueName = System.currentTimeMillis() + "_" + safeName;
                Path destPath = Paths.get(uploadDir + uniqueName);

                // Step 5: Use NIO Channels and Buffers for efficient I/O
                try (
                        ReadableByteChannel sourceChannel = Channels.newChannel(file.content());
                        FileChannel destChannel = FileChannel.open(
                                destPath,
                                StandardOpenOption.CREATE,
                                StandardOpenOption.WRITE)) {
                    // Allocate a ByteBuffer (data transfer unit)
                    ByteBuffer buffer = ByteBuffer.allocate(8192); // 8 KB chunks
                    long totalBytes = 0L;
                    int bytesRead;

                    // Step 6: Read from sourceChannel and write to destChannel in chunks
                    while ((bytesRead = sourceChannel.read(buffer)) != -1) {
                        buffer.flip(); // Switch buffer from read mode → write mode
                        destChannel.write(buffer); // Write data to disk

                        totalBytes += bytesRead; // Track uploaded size
                        buffer.clear(); // Prepare buffer for next read

                        // Step 7: Enforce file size limit
                        if (totalBytes > MAX_FILE_SIZE) {
                            destChannel.close();
                            Files.deleteIfExists(destPath);
                            ctx.status(413).result("File too large (max 5MB)");
                            return;
                        }
                    }
                }

                // Store the original filename mapping
                fileNameMap.put(uniqueName, originalName);

                // Step 8: Send confirmation response
                System.out.println("File uploaded by " + username + ": " + originalName);

                ctx.status(200).json(Map.of(
                        "message", "File uploaded successfully",
                        "filename", originalName));

                // Step 9: Notify all connected WebSocket clients
                String fileUrl = ctx.scheme() + "://" + ctx.host() + "/download/" + uniqueName;

                long sizeInBytes = Files.size(destPath);
                String readableSize = getReadableFileSize(sizeInBytes);

                String timestamp = java.time.LocalTime.now().withNano(0).toString();

                // Create payload object
                Message.Payload payload = new Message.Payload();
                payload.setUsername(username);
                payload.setFilename(originalName);
                payload.setFilesize(readableSize);
                payload.setUrl(fileUrl);

                // Create message wrapper
                Message message = new Message("FILE_UPLOAD", payload);
                message.setTimestamp(timestamp);

                // Convert to JSON using Jackson's ObjectMapper
                String jsonMessage = objectMapper.writeValueAsString(message);

                // Broadcast the message to all clients
                WebSocketHandler.broadcast(jsonMessage, null);

            } catch (JsonProcessingException e) {
                // Specific JSON serialization error
                ctx.status(500).json(Map.of("error", "Failed to serialize broadcast message: " + e.getMessage()));
            } catch (IOException e) {
                // File system or network I/O error
                ctx.status(500).json(Map.of("error", "File upload failed due to I/O error: " + e.getMessage()));
            }
        });

        // 3.5. Voice Message Upload API
        app.post("/upload-voice", ctx -> {
            // Step 1: Retrieve uploaded voice file, username, and duration
            List<UploadedFile> files = ctx.uploadedFiles("file");
            String username = ctx.formParam("username");
            String duration = ctx.formParam("duration");

            if (files.isEmpty()) {
                ctx.status(400).result("No voice file uploaded!");
                return;
            }

            if (username == null || username.trim().isEmpty()) {
                ctx.status(400).result("Username is required and cannot be empty.");
                return;
            }

            UploadedFile file = files.get(0);
            String uploadDir = "uploads/";
            final long MAX_FILE_SIZE = 5L * 1024L * 1024L; // 5 MB

            try {
                // Step 2: Ensure upload directory exists
                Files.createDirectories(Paths.get(uploadDir));

                // Step 3: Sanitize and prepare file name for voice message
                String originalName = file.filename();
                String safeName = (originalName == null)
                        ? "voice-message.webm"
                        : Paths.get(originalName).getFileName().toString();

                // Ensure it's a supported audio format
                String extension = safeName.substring(safeName.lastIndexOf('.') + 1).toLowerCase();
                if (!extension.matches("(webm|mp3|ogg|wav|m4a|aac)")) {
                    ctx.status(400).result("Invalid audio format. Supported: webm, mp3, ogg, wav, m4a, aac");
                    return;
                }

                // Step 4: Construct final destination path
                String uniqueName = System.currentTimeMillis() + "_voice_" + safeName;
                Path destPath = Paths.get(uploadDir + uniqueName);

                // Step 5: Use NIO Channels and Buffers for efficient I/O
                try (
                        ReadableByteChannel sourceChannel = Channels.newChannel(file.content());
                        FileChannel destChannel = FileChannel.open(
                                destPath,
                                StandardOpenOption.CREATE,
                                StandardOpenOption.WRITE)) {
                    ByteBuffer buffer = ByteBuffer.allocate(8192);
                    long totalBytes = 0L;
                    int bytesRead;

                    while ((bytesRead = sourceChannel.read(buffer)) != -1) {
                        buffer.flip();
                        destChannel.write(buffer);
                        totalBytes += bytesRead;
                        buffer.clear();

                        if (totalBytes > MAX_FILE_SIZE) {
                            destChannel.close();
                            Files.deleteIfExists(destPath);
                            ctx.status(413).result("Voice file too large (max 5MB)");
                            return;
                        }
                    }
                }

                // Store the original filename mapping
                fileNameMap.put(uniqueName, originalName);

                // Step 6: Send confirmation response
                System.out.println("Voice message uploaded by " + username + " (duration: " + duration + ")");

                ctx.status(200).json(Map.of(
                        "message", "Voice message uploaded successfully",
                        "filename", originalName));

                // Step 7: Notify all connected WebSocket clients
                String fileUrl = ctx.scheme() + "://" + ctx.host() + "/download/" + uniqueName;

                long sizeInBytes = Files.size(destPath);
                String readableSize = getReadableFileSize(sizeInBytes);

                String timestamp = java.time.LocalTime.now().withNano(0).toString();

                // Create payload object for voice message
                Message.Payload payload = new Message.Payload();
                payload.setUsername(username);
                payload.setFilename(originalName);
                payload.setFilesize(readableSize);
                payload.setUrl(fileUrl);
                payload.setDuration(duration != null ? duration : "0:00");

                // Create message wrapper with VOICE_MESSAGE type
                Message message = new Message("VOICE_MESSAGE", payload);
                message.setTimestamp(timestamp);

                // Convert to JSON using Jackson's ObjectMapper
                String jsonMessage = objectMapper.writeValueAsString(message);

                // Broadcast the message to all clients
                WebSocketHandler.broadcast(jsonMessage, null);

            } catch (JsonProcessingException e) {
                ctx.status(500).json(Map.of("error", "Failed to serialize broadcast message: " + e.getMessage()));
            } catch (IOException e) {
                ctx.status(500).json(Map.of("error", "Voice upload failed due to I/O error: " + e.getMessage()));
            }
        });

        /* ---- 4. File Download API (Using NIO) ---- */
        app.get("/download/{filename}", ctx -> {
            String uniqueName = ctx.pathParam("filename");

            // Only allow alphanumeric, underscore, dash, and dot
            if (!uniqueName.matches("^[a-zA-Z0-9._-]+$")) {
                ctx.status(400).result("Invalid filename");
                return;
            }

            // Define your uploads directory
            Path uploadsDir = Paths.get("uploads").toAbsolutePath().normalize();
            Path requestedFile = uploadsDir.resolve(uniqueName).normalize();

            // Prevent path traversal
            if (!requestedFile.startsWith(uploadsDir)) {
                ctx.status(403).result("Access denied: invalid file path");
                return;
            }

            // Check if file exists
            if (!Files.exists(requestedFile) || Files.isDirectory(requestedFile)) {
                ctx.status(404).result("File not found");
                return;
            }

            // Retrieve original filename from in-memory map
            String originalName = fileNameMap.getOrDefault(uniqueName, uniqueName);

            // Encode safely for header
            String encodedName = URLEncoder.encode(originalName, StandardCharsets.UTF_8)
                    .replace("+", "%20");

            long fileSize = Files.size(requestedFile);

            // Set headers
            ctx.header("Content-Type", Files.probeContentType(requestedFile));
            ctx.header("Content-Length", String.valueOf(fileSize));
            ctx.header("Content-Disposition",
                    "attachment; filename=\"" + originalName.replaceAll("[\\r\\n\"]", "_") +
                            "\"; filename*=UTF-8''" + encodedName);

            // Stream file efficiently using NIO
            try (FileChannel fileChannel = FileChannel.open(requestedFile, StandardOpenOption.READ);
                    WritableByteChannel outputChannel = Channels.newChannel(ctx.res().getOutputStream())) {

                long transferred = 0;
                while (transferred < fileSize) {
                    transferred += fileChannel.transferTo(transferred, fileSize - transferred, outputChannel);
                }

            } catch (IOException e) {
                System.err.println("File transfer failed: " + e.getMessage());
                e.printStackTrace();

                // Try to set response only if it's still open
                if (!ctx.res().isCommitted()) {
                    ctx.status(500).result("Error while sending file");
                } else {
                    // Response already started — just log it
                    ctx.req().getAsyncContext().complete();
                }
            }
        });
    }

    /* ---- Helper: Convert bytes to human-readable size ---- */
    private static String getReadableFileSize(long size) {
        // Avoid invalid or undefined logarithmic calculations
        if (size <= 0)
            return size == 0 ? "0 B" : "Invalid size";

        final String[] units = { "B", "KB", "MB", "GB", "TB" };
        int digitGroups = (int) (Math.log10(size) / Math.log10(1024));

        // Cap to prevent index out of range
        if (digitGroups >= units.length)
            digitGroups = units.length - 1;

        return String.format("%.2f %s", size / Math.pow(1024, digitGroups), units[digitGroups]);
    }
}
