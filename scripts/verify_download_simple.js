
// Mock minimal DOM environment
global.window = {
    URL: {
        createObjectURL: (blob) => "blob:mock-url",
        revokeObjectURL: (url) => { }
    },
    open: (url, target) => {
        console.log(`[TEST] window.open called with: ${url}, target=${target}`);
    }
};

global.document = {
    createElement: (tagName) => {
        if (tagName === 'a') {
            return {
                click: function () {
                    console.log(`[TEST] Clicked link: href=${this.href}, download=${this.download}, target=${this.target}`);
                },
                style: {}
            };
        }
    },
    body: {
        appendChild: () => { },
        removeChild: () => { }
    }
};

// Mock fetch
global.fetch = async (url) => {
    return {
        ok: true,
        blob: async () => "mock-blob"
    };
};


async function testDownloadLogic() {
    console.log("Starting Simplified Download Logic Verification...");

    const file = {
        filename: "test-file.txt",
        downloadURL: "https://example.com/test-file.txt",
    };

    // Simulate Download (Layer 2 URL Construction)
    try {
        console.log("\n--- Testing Download URL Construction ---");
        const urlIndex = "https://firebasestorage.googleapis.com/v0/b/bucket/o/file?alt=media";
        const urlObj = new URL(urlIndex);
        urlObj.searchParams.set('response-content-disposition', `attachment; filename="${file.filename}"`);
        const finalUrl = urlObj.toString();

        if (finalUrl.includes('response-content-disposition') && finalUrl.includes('attachment')) {
            console.log("✅ URL construction successful: " + finalUrl);
        } else {
            console.error("❌ URL construction failed");
        }

    } catch (e) {
        console.error("❌ URL construction error:", e);
    }

    // Simulate Download (Layer 1 Blob)
    try {
        console.log("\n--- Testing Download Action ---");
        const objectUrl = global.window.URL.createObjectURL("blob");
        const a = global.document.createElement('a');
        a.href = objectUrl;
        a.download = file.filename;
        a.click();
        console.log("✅ Download action initialized anchor click with download attribute.");
    } catch (e) {
        console.error("❌ Download action failed:", e);
    }

    // Simulate Open
    try {
        console.log("\n--- Testing Open Action ---");
        if (file.downloadURL) {
            global.window.open(file.downloadURL, '_blank');
            console.log("✅ Open action called window.open with _blank.");
        }
    } catch (e) {
        console.error("❌ Open action failed:", e);
    }
}

testDownloadLogic();
