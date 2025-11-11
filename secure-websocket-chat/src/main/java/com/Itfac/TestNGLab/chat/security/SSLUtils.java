package com.Itfac.TestNGLab.chat.security;

import javax.net.ssl.*;
import java.io.FileInputStream;
import java.io.IOException;
import java.security.*;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;

/**
 * Utility class for SSL/TLS configuration and management.
 * Provides methods to load keystores, create SSL contexts, and configure trust managers.
 * 
 * @author Member 3 - Security Implementation
 * @version 1.0
 */
public class SSLUtils {

    /**
     * Loads a KeyStore from file system.
     * 
     * @param keystorePath Path to the keystore file
     * @param password Password for the keystore
     * @return Loaded KeyStore instance
     * @throws KeyStoreException If keystore cannot be initialized
     * @throws IOException If file cannot be read
     * @throws NoSuchAlgorithmException If keystore algorithm is not available
     * @throws CertificateException If certificates cannot be loaded
     */
    public static KeyStore loadKeyStore(String keystorePath, char[] password)
            throws KeyStoreException, IOException, NoSuchAlgorithmException, CertificateException {
        
        KeyStore keyStore = KeyStore.getInstance("JKS");
        try (FileInputStream fis = new FileInputStream(keystorePath)) {
            keyStore.load(fis, password);
        }
        System.out.println("KeyStore loaded from: " + keystorePath);
        return keyStore;
    }

    /**
     * Creates an SSLContext for server using provided KeyStore.
     * Configures both KeyManager and TrustManager for mutual TLS support.
     * 
     * @param keyStore KeyStore containing server certificate and private key
     * @param password Password for the keystore
     * @return Configured SSLContext with TLSv1.3
     * @throws Exception If SSL context cannot be initialized
     */
    public static SSLContext createServerSSLContext(KeyStore keyStore, char[] password) throws Exception {
        // Initialize KeyManagerFactory with keystore
        KeyManagerFactory kmf = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());
        kmf.init(keyStore, password);

        // Initialize TrustManagerFactory with keystore (for mutual TLS, optional)
        TrustManagerFactory tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
        tmf.init(keyStore);

        // Create and initialize SSLContext
        SSLContext sslContext = SSLContext.getInstance("TLS");
        sslContext.init(kmf.getKeyManagers(), tmf.getTrustManagers(), new SecureRandom());
        
        System.out.println("Server SSLContext initialized with TLS");
        return sslContext;
    }

    /**
     * Creates an SSLContext for client with custom TrustStore.
     * Use this for production with proper certificate validation.
     * 
     * @param trustStorePath Path to client truststore
     * @param password Password for the truststore
     * @return Configured SSLContext for client
     * @throws Exception If SSL context cannot be initialized
     */
    public static SSLContext createClientSSLContext(String trustStorePath, char[] password) throws Exception {
        KeyStore trustStore = loadKeyStore(trustStorePath, password);

        TrustManagerFactory tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
        tmf.init(trustStore);

        SSLContext sslContext = SSLContext.getInstance("TLS");
        sslContext.init(null, tmf.getTrustManagers(), new SecureRandom());
        
        System.out.println("Client SSLContext initialized with custom TrustStore");
        return sslContext;
    }

    /**
     * Creates an insecure TrustManager that accepts all certificates.
     * WARNING: USE ONLY FOR DEVELOPMENT/TESTING!
     * This bypasses certificate validation and is vulnerable to MITM attacks.
     * 
     * @return TrustManager array that trusts all certificates
     */
    public static TrustManager[] createInsecureTrustManager() {
        System.err.println("WARNING: Using insecure TrustManager - accepts ALL certificates!");
        System.err.println("This should NEVER be used in production!");
        
        return new TrustManager[]{
            new X509TrustManager() {
                @Override
                public X509Certificate[] getAcceptedIssuers() {
                    return new X509Certificate[0];
                }

                @Override
                public void checkClientTrusted(X509Certificate[] certs, String authType) {
                    // Accept all client certificates (insecure)
                }

                @Override
                public void checkServerTrusted(X509Certificate[] certs, String authType) {
                    // Accept all server certificates (insecure)
                }
            }
        };
    }

    /**
     * Creates an SSLContext for development client that accepts self-signed certificates.
     * USE ONLY FOR DEVELOPMENT!
     * 
     * @return SSLContext with insecure trust manager
     * @throws Exception If SSL context cannot be initialized
     */
    public static SSLContext createInsecureClientSSLContext() throws Exception {
        SSLContext sslContext = SSLContext.getInstance("TLS");
        sslContext.init(null, createInsecureTrustManager(), new SecureRandom());
        
        // Disable hostname verification (development only)
        HttpsURLConnection.setDefaultHostnameVerifier((hostname, session) -> true);
        
        System.err.println("Client SSLContext configured with insecure settings");
        return sslContext;
    }

    /**
     * Enables SSL debug logging for troubleshooting.
     * Call this before creating SSL connections.
     */
    public static void enableSSLDebug() {
        System.setProperty("javax.net.debug", "ssl,handshake");
        System.out.println("SSL debug logging enabled");
    }

    /**
     * Validates if SSL is properly configured by checking system properties.
     * 
     * @return true if keystore path is configured, false otherwise
     */
    public static boolean isSSLConfigured() {
        String keystorePath = System.getProperty("javax.net.ssl.keyStore");
        return keystorePath != null && !keystorePath.isEmpty();
    }

    /**
     * Gets the configured keystore path from system properties.
     * 
     * @return Keystore path or default value
     */
    public static String getKeystorePath() {
        return System.getProperty("javax.net.ssl.keyStore", "keystore/server.keystore");
    }

    /**
     * Gets the configured keystore password from system properties.
     * 
     * @return Keystore password or default value
     */
    public static String getKeystorePassword() {
        return System.getProperty("javax.net.ssl.keyStorePassword", "changeit");
    }
}
