"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AndroidAutomation = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const search_1 = require("./search");
const phone_1 = require("./phone");
const screen_dump_1 = require("./screen-dump");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class AndroidAutomation {
    // Check connected devices
    static async listDevices() {
        console.log('Checking connected devices...');
        await this.runAdbCommand(['devices']);
    }
    // Open Chrome browser
    static async openChrome() {
        console.log('Opening Chrome...');
        await this.runAdbCommand([
            'shell', 'am', 'start', '-n',
            'com.android.chrome/com.google.android.apps.chrome.Main'
        ]);
        await this.delay(3000);
    }
    // Dump UI hierarchy and find elements
    static async dumpUI() {
        console.log('Dumping UI hierarchy...');
        const result = await this.runAdbCommand(['shell', 'uiautomator', 'dump']);
        if (result) {
            const xmlResult = await this.runAdbCommand(['shell', 'cat', '/sdcard/window_dump.xml']);
            return xmlResult || '';
        }
        return '';
    }
    // Find element by resource-id and click
    static async clickByResourceId(resourceId) {
        const xml = await this.dumpUI();
        const bounds = this.parseElementBounds(xml, 'resource-id', resourceId);
        if (bounds) {
            console.log(`Clicking element with resource-id: ${resourceId}`);
            await this.runAdbCommand(['shell', 'input', 'tap', bounds.x.toString(), bounds.y.toString()]);
            return true;
        }
        console.log(`Element with resource-id '${resourceId}' not found`);
        return false;
    }
    // Find element by text and click
    static async clickByText(text) {
        const xml = await this.dumpUI();
        const bounds = this.parseElementBounds(xml, 'text', text);
        if (bounds) {
            console.log(`Clicking element with text: ${text}`);
            await this.runAdbCommand(['shell', 'input', 'tap', bounds.x.toString(), bounds.y.toString()]);
            return true;
        }
        console.log(`Element with text '${text}' not found`);
        return false;
    }
    // Find element by content-desc and click
    static async clickByContentDesc(contentDesc) {
        const xml = await this.dumpUI();
        const bounds = this.parseElementBounds(xml, 'content-desc', contentDesc);
        if (bounds) {
            console.log(`Clicking element with content-desc: ${contentDesc}`);
            await this.runAdbCommand(['shell', 'input', 'tap', bounds.x.toString(), bounds.y.toString()]);
            return true;
        }
        console.log(`Element with content-desc '${contentDesc}' not found`);
        return false;
    }
    // Find element by class and click
    static async clickByClass(className) {
        const xml = await this.dumpUI();
        const bounds = this.parseElementBounds(xml, 'class', className);
        if (bounds) {
            console.log(`Clicking element with class: ${className}`);
            await this.runAdbCommand(['shell', 'input', 'tap', bounds.x.toString(), bounds.y.toString()]);
            return true;
        }
        console.log(`Element with class '${className}' not found`);
        return false;
    }
    // Parse XML to find element bounds
    static parseElementBounds(xml, attribute, value) {
        const regex = new RegExp(`${attribute}="${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"`);
        const match = xml.match(regex);
        if (match) {
            const x1 = parseInt(match[1]);
            const y1 = parseInt(match[2]);
            const x2 = parseInt(match[3]);
            const y2 = parseInt(match[4]);
            // Return center coordinates
            return {
                x: Math.floor((x1 + x2) / 2),
                y: Math.floor((y1 + y2) / 2)
            };
        }
        return null;
    }
    // Additional utility methods
    static async goBack() {
        await this.runAdbCommand(['shell', 'input', 'keyevent', 'KEYCODE_BACK']);
    }
    static async goHome() {
        await this.runAdbCommand(['shell', 'input', 'keyevent', 'KEYCODE_HOME']);
    }
    // Execute ADB command
    static async runAdbCommand(args) {
        try {
            const command = `adb ${args.join(' ')}`;
            const { stdout, stderr } = await execAsync(command);
            if (stdout) {
                console.log(stdout);
            }
            if (stderr) {
                console.log(`Error: ${stderr}`);
            }
            return stdout;
        }
        catch (error) {
            console.log(`Failed to execute ADB command: ${error}`);
            return null;
        }
    }
    // Delay helper
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.AndroidAutomation = AndroidAutomation;
async function main() {
    console.log('=== Android Automation POC ===\n');
    await AndroidAutomation.listDevices();
    await AndroidAutomation.delay(2000);
    const action = process.argv[2] || 'search';
    const query = process.argv[3] || 'React Native vs Flutter';
    switch (action.toLowerCase()) {
        case 'search':
            console.log('\n--- Smart Search ---');
            await AndroidAutomation.openChrome();
            await search_1.SearchAutomation.smartSearch(query);
            break;
        case 'call':
            console.log('\n--- Phone Call ---');
            await phone_1.PhoneAutomation.makeCall(query);
            break;
        case 'contact':
            console.log('\n--- Call Contact ---');
            await phone_1.PhoneAutomation.callContact(query);
            break;
        case 'voice':
            console.log('\n--- Voice Search ---');
            await AndroidAutomation.openChrome();
            await search_1.SearchAutomation.voiceSearch();
            break;
        case 'dump':
            console.log('\n--- Screen Dump ---');
            await screen_dump_1.ScreenDump.analyzeScreen();
            break;
        case 'transfer':
            console.log('\n--- K-Bank Transfer ---');
            const { KBankTransfer } = await Promise.resolve().then(() => __importStar(require('./transfer-kbank')));
            await KBankTransfer.startTransfer();
            break;
        default:
            console.log('Available actions: search, call, contact, voice, dump, transfer');
            console.log('Usage: npm run dev <action> <query>');
            console.log('Examples:');
            console.log('  npm run dev search "Flutter tutorial"');
            console.log('  npm run dev call "1234567890"');
            console.log('  npm run dev contact "John Doe"');
            console.log('  npm run dev voice');
            console.log('  npm run dev dump');
            console.log('  npm run dev transfer');
    }
    console.log('\nCompleted!');
}
// Run the automation
main().catch(console.error);
