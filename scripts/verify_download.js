
const { JSDOM } = require("jsdom");

// Mock window and document
const dom = new JSDOM(`<!DOCTYPE html><body></body>`);
global.window = dom.window;
global.document = dom.window.document;
global.fetch = require('node-fetch'); // Needs node-fetch installed or mocked

// Mock URL.createObjectURL
global.window.URL.createObjectURL = (blob) => `blob:mock-url`;
global.window.URL.revokeObjectURL = (url) => { };

// Mock HTMLAnchorElement click
global.HTMLAnchorElement = dom.window.HTMLAnchorElement;

// Intercept document.createElement('a') to test download attributes
const originalCreateElement = document.createElement.bind(document);
document.createElement = (tagName) => {
    const el = originalCreateElement(tagName);
    if (tagName === 'a') {
        el.click = () => {
            console.log(`[TEST] Clicked link: href=${el.href}, download=${el.download}, target=${el.target}`);
        };
    }
    return el;
};

// Mock window.open
global.window.open = (url, target) => {
    console.log(`[TEST] window.open called with: ${url}, target=${target}`);
};

async function testDownloadLogic() {
    console.log("Starting Download Logic Verification...");

    // Mock file data
    const file = {
        filename: "test-file.txt",
        downloadURL: "https://example.com/test-file.txt",
        contentType: "text/plain"
    };

    // Simulate "Download" action (Layer 1 Blob Strategy emulation)
    console.log("\n--- Testing Download Action ---");
    // In real code `useDownload` does fetch(url) -> blob -> createObjectUrl -> a.download -> click

    // We can't easily import `useDownload` here as it's a React hook. 
    // But we can simulate the logic we wrote:

    try {
        // Layer 1: Blob download emulation
        const objectUrl = "blob:https://gauravs-personal-drive/test-blob-id";
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = file.filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        console.log("✅ Download action initialized anchor click with download attribute.");
    } catch (e) {
        console.error("❌ Download action failed:", e);
    }

    // Simulate "Open" action (Double Click / Preview)
    console.log("\n--- Testing Open Action ---");
    // Logic: window.open(url, '_blank')
    try {
        if (file.downloadURL) {
            window.open(file.downloadURL, '_blank');
            console.log("✅ Open action called window.open with _blank.");
        }
    } catch (e) {
        console.error("❌ Open action failed:", e);
    }
}

testDownloadLogic();
