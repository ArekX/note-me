import { beforeEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { MockWebSocket, mockControl } from "./mock-backend";

// Assigned rather than stubbed so vi.unstubAllGlobals in a test keeps it.
globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;

// Every test gets a fresh pinia and fixtures so state does not leak between
// tests.
beforeEach(() => {
    setActivePinia(createPinia());
    mockControl.resetState();
});
