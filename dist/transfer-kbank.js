"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KBankTransfer = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class KBankTransfer {
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
    // Open K PLUS app
    static async openKPlusApp() {
        console.log('Opening K PLUS app...');
        await this.runAdbCommand([
            'shell', 'monkey', '-p', 'com.kasikorn.retail.mbanking.wap', '-c', 'android.intent.category.LAUNCHER', '1'
        ]);
        await this.delay(3000);
    }
    // Click on โอนเงิน button by text
    static async clickTransferButton() {
        console.log('Looking for โอนเงิน button...');
        // Dump UI to find the button
        await this.runAdbCommand(['shell', 'uiautomator', 'dump']);
        const xml = await this.runAdbCommand(['shell', 'cat', '/sdcard/window_dump.xml']);
        if (xml) {
            // Click directly on the known coordinates for โอนเงิน
            console.log('Clicking on โอนเงิน button at coordinates: 195, 1358');
            await this.runAdbCommand(['shell', 'input', 'tap', '195', '1358']);
            return true;
        }
        console.log('Failed to dump UI');
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
    // Take screenshot
    static async takeScreenshot(filename = 'kbank_transfer.png') {
        console.log('Taking screenshot...');
        await this.runAdbCommand(['shell', 'screencap', '/sdcard/screenshot.png']);
        await this.runAdbCommand(['pull', '/sdcard/screenshot.png', filename]);
        console.log(`Screenshot saved to: ${process.cwd()}/${filename}`);
    }
    // Dump UI
    static async dumpUI(filename = 'kbank_transfer.xml') {
        console.log('Dumping UI...');
        await this.runAdbCommand(['shell', 'uiautomator', 'dump']);
        await this.runAdbCommand(['pull', '/sdcard/window_dump.xml', filename]);
        console.log(`UI dump saved to: ${process.cwd()}/${filename}`);
    }
    // Main transfer flow
    static async startTransfer() {
        console.log('=== K PLUS Transfer Automation ===\n');
        // Open app
        await this.openKPlusApp();
        // Take initial screenshot
        await this.takeScreenshot('kbank_before_transfer.png');
        // Click transfer button
        const success = await this.clickTransferButton();
        if (success) {
            console.log('Successfully clicked โอนเงิน button!');
            await this.delay(2000);
            // Take screenshot after clicking
            await this.takeScreenshot('kbank_after_transfer_click.png');
            await this.dumpUI('kbank_after_transfer_click.xml');
        }
        else {
            console.log('Failed to find โอนเงิน button');
            await this.dumpUI('kbank_error_dump.xml');
        }
        console.log('\nTransfer automation completed!');
    }
    // Delay helper
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.KBankTransfer = KBankTransfer;
