package com.Itfac.TestNGLab.chat.models;

/**
 * Enhanced Message model with timestamps and additional metadata
 * 
 * @author Member 3 - Full Stack Development
 * @version 2.0
 */
public class Message {
    private String type;
    private Payload payload;
    private String timestamp; // HH:mm:ss format

    public Message(String type, Payload payload) {
        this.type = type;
        this.payload = payload;
    }

    public String getType() {
        return type;
    }

    public Payload getPayload() {
        return payload;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }

    public static class Payload {
        private String username;
        private String text;
        private String[] users;
        private String filename; // For file upload notifications
        private String filesize; // Size of the uploaded file
        private String url; // Download URL for the uploaded file
        private String duration; // Duration for voice messages (e.g., "0:15")

        // Whiteboard drawing data
        private Object drawData; // Drawing coordinates and style data

        public Payload() {
        }

        public Payload(String username) {
            this.username = username;
        }

        public Payload(String username, String text) {
            this.username = username;
            this.text = text;
        }

        public String getUsername() {
            return username;
        }

        public String getText() {
            return text;
        }

        public String[] getUsers() {
            return users;
        }

        public String getFilename() {
            return filename;
        }

        public String getFilesize() {
            return filesize;
        }

        public String getUrl() {
            return url;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public void setText(String text) {
            this.text = text;
        }

        public void setUsers(String[] users) {
            this.users = users;
        }

        public void setFilename(String filename) {
            this.filename = filename;
        }

        public void setFilesize(String filesize) {
            this.filesize = filesize;
        }

        public void setUrl(String url) {
            this.url = url;
        }

        public String getDuration() {
            return duration;
        }

        public void setDuration(String duration) {
            this.duration = duration;
        }

        public Object getDrawData() {
            return drawData;
        }

        public void setDrawData(Object drawData) {
            this.drawData = drawData;
        }

    }
}
