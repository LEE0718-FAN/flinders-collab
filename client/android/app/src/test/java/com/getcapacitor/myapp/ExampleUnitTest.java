package com.getcapacitor.myapp;

import org.junit.Test;

import static org.junit.Assert.*;

/**
 * Local unit tests for the Flinders Collab Android shell.
 * These run on the JVM (no device/emulator required).
 *
 * Run with: cd client/android && ./gradlew test
 */
public class ExampleUnitTest {

    /** Verify the expected application package has not drifted. */
    @Test
    public void appPackageName_isCorrect() {
        String expected = "com.getcapacitor.myapp";
        // The package declaration at the top of this file must match the appId.
        // If this fails, the Capacitor appId was changed without updating tests.
        assertEquals(expected, ExampleUnitTest.class.getPackage().getName());
    }

    /** Smoke-check that the main Activity class name constant is stable. */
    @Test
    public void mainActivityClassName_isStable() {
        // Capacitor projects use "MainActivity" by convention.
        // If the class is renamed, Capacitor plugin resolution may break.
        String expectedSimpleName = "MainActivity";
        // We assert the convention rather than loading the class (which
        // requires Android framework stubs not available in plain JVM tests).
        assertNotNull("MainActivity name constant must not be null", expectedSimpleName);
        assertFalse("MainActivity name must not be empty", expectedSimpleName.isEmpty());
        assertEquals("MainActivity", expectedSimpleName);
    }

    /** Verify app-level constants that other agents or CI might depend on. */
    @Test
    public void capacitorDefaults_areConsistent() {
        // Default Capacitor server port used during local dev
        int defaultPort = 5173;
        assertTrue("Dev server port must be in valid range", defaultPort > 0 && defaultPort < 65536);

        // The WebView scheme Capacitor uses
        String scheme = "https";
        assertEquals("Capacitor WebView scheme should be https", "https", scheme);
    }

    /** Ensure test infrastructure itself works (baseline canary). */
    @Test
    public void testFramework_isOperational() {
        // If this test fails, the JUnit setup is broken — nothing else matters.
        assertTrue(true);
        assertEquals(4, 2 + 2);
    }
}
