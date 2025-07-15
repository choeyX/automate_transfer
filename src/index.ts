import { exec } from 'child_process';
import { promisify } from 'util';
import { SearchAutomation } from './search';
import { PhoneAutomation } from './phone';
import { ScreenDump } from './screen-dump';

const execAsync = promisify(exec);

export class AndroidAutomation {
  // Check connected devices
  static async listDevices(): Promise<void> {
    console.log('Checking connected devices...');
    await this.runAdbCommand(['devices']);
  }

  // Open Chrome browser
  static async openChrome(): Promise<void> {
    console.log('Opening Chrome...');
    await this.runAdbCommand([
      'shell', 'am', 'start', '-n',
      'com.android.chrome/com.google.android.apps.chrome.Main'
    ]);
    await this.delay(3000);
  }

  // Dump UI hierarchy and find elements
  static async dumpUI(): Promise<string> {
    console.log('Dumping UI hierarchy...');
    const result = await this.runAdbCommand(['shell', 'uiautomator', 'dump']);
    if (result) {
      const xmlResult = await this.runAdbCommand(['shell', 'cat', '/sdcard/window_dump.xml']);
      return xmlResult || '';
    }
    return '';
  }

  // Find element by resource-id and click
  static async clickByResourceId(resourceId: string): Promise<boolean> {
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
  static async clickByText(text: string): Promise<boolean> {
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
  static async clickByContentDesc(contentDesc: string): Promise<boolean> {
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
  static async clickByClass(className: string): Promise<boolean> {
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
  protected static parseElementBounds(xml: string, attribute: string, value: string): { x: number, y: number } | null {
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
  static async goBack(): Promise<void> {
    await this.runAdbCommand(['shell', 'input', 'keyevent', 'KEYCODE_BACK']);
  }

  static async goHome(): Promise<void> {
    await this.runAdbCommand(['shell', 'input', 'keyevent', 'KEYCODE_HOME']);
  }

  // Execute ADB command
  protected static async runAdbCommand(args: string[]): Promise<string | null> {
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
    } catch (error) {
      console.log(`Failed to execute ADB command: ${error}`);
      return null;
    }
  }

  // Delay helper
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function main(): Promise<void> {
  console.log('=== Android Automation POC ===\n');

  await AndroidAutomation.listDevices();
  await AndroidAutomation.delay(2000);

  const action = process.argv[2] || 'search';
  const query = process.argv[3] || 'React Native vs Flutter';

  switch (action.toLowerCase()) {
    case 'search':
      console.log('\n--- Smart Search ---');
      await AndroidAutomation.openChrome();
      await SearchAutomation.smartSearch(query);
      break;

    case 'call':
      console.log('\n--- Phone Call ---');
      await PhoneAutomation.makeCall(query);
      break;

    case 'contact':
      console.log('\n--- Call Contact ---');
      await PhoneAutomation.callContact(query);
      break;

    case 'voice':
      console.log('\n--- Voice Search ---');
      await AndroidAutomation.openChrome();
      await SearchAutomation.voiceSearch();
      break;

    case 'dump':
      console.log('\n--- Screen Dump ---');
      await ScreenDump.analyzeScreen();
      break;

    case 'transfer':
      console.log('\n--- K-Bank Transfer ---');
      const pin = process.argv[3];
      const promptPayId = process.argv[4];
      const amount = process.argv[5] || '1';
      
      if (!pin || !promptPayId) {
        console.log('Usage: npm run dev transfer <PIN> <PromptPayID> [amount]');
        console.log('Example: npm run dev transfer 123456 0123456789 100');
        break;
      }
      
      const { KBankTransfer } = await import('./transfer-kbank');
      await KBankTransfer.performTransfer(pin, promptPayId, amount);
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
      console.log('  npm run dev transfer <PIN> <PromptPayID> [amount]');
  }

  console.log('\nCompleted!');
}

// Run the automation
main().catch(console.error);