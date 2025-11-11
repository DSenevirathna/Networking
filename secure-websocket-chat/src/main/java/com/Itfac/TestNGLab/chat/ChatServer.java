package com.Itfac.TestNGLab.chat;

import org.eclipse.jetty.server.Connector;
import org.eclipse.jetty.server.HttpConfiguration;
import org.eclipse.jetty.server.HttpConnectionFactory;
import org.eclipse.jetty.server.SecureRequestCustomizer;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.server.ServerConnector;
import org.eclipse.jetty.server.SslConnectionFactory;
import org.eclipse.jetty.util.ssl.SslContextFactory;

import com.Itfac.TestNGLab.chat.security.SSLUtils;

import io.javalin.Javalin;
import io.javalin.json.JavalinJackson;

/**
 * Secure WebSocket Chat Server with optional SSL/TLS support.
 * 
 * @author Member 3 - Security Implementation
 * @version 1.0
 */
public class ChatServer {

    // Configuration
    private static final int DEFAULT_PORT = 7070;
    private static final int DEFAULT_SSL_PORT = 7443;
    private static final boolean SSL_ENABLED = Boolean.parseBoolean(
            System.getProperty("ssl.enabled", "false"));

    public static void main(String[] args) {
        int port;

        if (args.length > 0) {
            try {
                port = Integer.parseInt(args[0]);
            } catch (NumberFormatException e) {
                System.err.println("Invalid port number '" + args[0] + "'. Using default port.");
                port = SSL_ENABLED ? DEFAULT_SSL_PORT : DEFAULT_PORT;
            }
        } else {
            port = SSL_ENABLED ? DEFAULT_SSL_PORT : DEFAULT_PORT;
        }

        try {
            Javalin app;

            if (SSL_ENABLED) {
                // SSL mode: Configure with Jetty SSL connector
                configureSSL();
                System.out.println("SSL/TLS Mode ENABLED");

                // Create Jetty server instance with SSL connector first
                Server jettyServer = createSSLServer(port);

                // Create Javalin app with custom Jetty server (Javalin 5.x API)
                app = Javalin.create(config -> {
                    config.plugins.enableCors(cors -> {
                        cors.add(it -> it.anyHost());
                    });
                    // Javalin 5.x: Use config.jetty.server to provide custom Jetty Server
                    config.jetty.server(() -> jettyServer);

                    // Configure Javalin to use Jackson for JSON serialization and deserialization,
                    // ensuring proper handling of JSON requests and responses
                    config.jsonMapper(new JavalinJackson());
                }).start();
            } else {
                System.out.println("SSL/TLS Mode DISABLED (development mode)");

                // Create Javalin app without SSL (Javalin 5.x API)
                app = Javalin.create(config -> {
                    config.plugins.enableCors(cors -> {
                        cors.add(it -> it.anyHost());
                    });

                    config.jsonMapper(new JavalinJackson());
                }).start(port);
            }

            // WebSocket endpoint
            app.ws("/chat", ws -> {
                ws.onConnect(WebSocketHandler::onConnect);
                ws.onMessage(WebSocketHandler::onMessage);
                ws.onClose(WebSocketHandler::onClose);
                // Javalin 5.x: onError uses WsErrorContext
                ws.onError(ctx -> WebSocketHandler.onError(ctx, ctx.error()));
            });

            // Register REST routes (File upload + Status)
            ApiController.registerRoutes(app);

            // Print startup information
            printServerInfo(port, SSL_ENABLED);

        } catch (Exception e) {
            System.err.println("Failed to start server: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }

    /**
     * Creates a Jetty server with SSL/TLS support.
     * 
     * @param port The port to listen on
     * @return Configured Jetty Server with SSL
     */
    private static Server createSSLServer(int port) {
        try {
            Server server = new Server();

            // SSL Context Factory
            SslContextFactory.Server sslContextFactory = new SslContextFactory.Server();

            String keystorePath = SSLUtils.getKeystorePath();
            String keystorePassword = SSLUtils.getKeystorePassword();

            sslContextFactory.setKeyStorePath(keystorePath);
            sslContextFactory.setKeyStorePassword(keystorePassword);
            sslContextFactory.setKeyManagerPassword(keystorePassword);

            // Enable TLS 1.2 and 1.3
            sslContextFactory.setIncludeProtocols("TLSv1.2", "TLSv1.3");

            // SSL Connector Configuration
            HttpConfiguration httpsConfig = new HttpConfiguration();
            httpsConfig.setSecureScheme("https");
            httpsConfig.setSecurePort(port);
            httpsConfig.addCustomizer(new SecureRequestCustomizer());

            ServerConnector sslConnector = new ServerConnector(
                    server,
                    new SslConnectionFactory(sslContextFactory, "http/1.1"),
                    new HttpConnectionFactory(httpsConfig));
            sslConnector.setPort(port);

            server.setConnectors(new Connector[] { sslConnector });

            return server;
        } catch (Exception e) {
            throw new RuntimeException("Failed to create SSL Jetty server", e);
        }
    }

    /**
     * Configures SSL/TLS by setting system properties for JSSE.
     * This approach works with Javalin's default Jetty server.
     * 
     * @throws Exception If SSL configuration fails
     */
    private static void configureSSL() throws Exception {
        String keystorePath = SSLUtils.getKeystorePath();
        String keystorePassword = SSLUtils.getKeystorePassword();

        System.out.println("Loading keystore from: " + keystorePath);

        // Verify keystore exists and is valid
        SSLUtils.loadKeyStore(keystorePath, keystorePassword.toCharArray());

        // Set system properties for JSSE (Java Secure Socket Extension)
        System.setProperty("javax.net.ssl.keyStore", keystorePath);
        System.setProperty("javax.net.ssl.keyStorePassword", keystorePassword);
        System.setProperty("javax.net.ssl.keyStoreType", "JKS");

        // Optional: Configure TLS protocols
        System.setProperty("https.protocols", "TLSv1.2,TLSv1.3");

        System.out.println("SSL system properties configured");
    }

    /**
     * Prints server startup information.
     * 
     * @param port       Server port
     * @param sslEnabled Whether SSL is enabled
     */
    private static void printServerInfo(int port, boolean sslEnabled) {
        String protocol = sslEnabled ? "https" : "http";
        String wsProtocol = sslEnabled ? "wss" : "ws";

        System.out.println("\n" + "=".repeat(60));
        System.out.println("  Secure WebSocket Chat Server");
        System.out.println("  Member 3 - Security Implementation");
        System.out.println("=".repeat(60));
        System.out.println();
        System.out.println("Server started successfully on port " + port);
        System.out.println();
        System.out.println("Endpoints:");
        System.out.println("    WebSocket:    " + wsProtocol + "://localhost:" + port + "/chat");
        System.out.println("    File Upload:  " + protocol + "://localhost:" + port + "/upload");
        System.out.println("    Server Status:" + protocol + "://localhost:" + port + "/status");
        System.out.println();

        if (sslEnabled) {
            System.out.println("Security: SSL/TLS ENABLED");
            System.out.println("    Protocol: TLSv1.2, TLSv1.3");
            System.out.println("    KeyStore: " + SSLUtils.getKeystorePath());
        } else {
            System.out.println("Security: SSL/TLS DISABLED");
            System.out.println("    To enable SSL, run with: -Dssl.enabled=true");
            System.out.println("    Generate keystore first: generate-keystore.bat");
        }

        System.out.println();
        System.out.println("=".repeat(60));
        System.out.println("Press Ctrl+C to stop the server");
        System.out.println("=".repeat(60));
        System.out.println();
    }
}