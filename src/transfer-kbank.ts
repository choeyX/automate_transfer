import { exec } from 'child_process';
import { promisify } from 'util';
import { parseStringPromise } from 'xml2js';

const execAsync = promisify(exec);

export class KBankTransfer {
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

  // Open K PLUS app
  static async openKPlusApp(): Promise<void> {
    // Clear session (force-stop app)
    console.log('Force-stopping K PLUS app to clear session...');
    await this.runAdbCommand([
      'shell', 'am', 'force-stop', 'com.kasikorn.retail.mbanking.wap'
    ]);
    console.log('Opening K PLUS app...');
    await this.runAdbCommand([
      'shell', 'monkey', '-p', 'com.kasikorn.retail.mbanking.wap', '-c', 'android.intent.category.LAUNCHER', '1'
    ]);
    console.log('Waiting 10 seconds for app to fully load...');
    await this.delay(10000);
  }

  // Click on โอนเงิน button by finding its clickable parent in UI hierarchy
  static async clickTransferButton(): Promise<boolean> {
    console.log('Looking for โอนเงิน button...');
    // Dump UI to find the button
    console.log('Dumping UI hierarchy...');
    await this.runAdbCommand(['shell', 'uiautomator', 'dump']);
    const xml = await this.runAdbCommand(['shell', 'cat', '/sdcard/window_dump.xml']);
    if (xml) {
      const bounds = await this.findClickableParentBounds(xml, 'โอนเงิน');
      if (bounds) {
        console.log(`Found clickable parent for โอนเงิน at coordinates: ${bounds.x}, ${bounds.y}`);
        await this.runAdbCommand(['shell', 'input', 'tap', bounds.x.toString(), bounds.y.toString()]);
        return true;
      }
      console.log('Clickable parent for โอนเงิน button not found in UI hierarchy');
      return false;
    }
    console.log('Failed to dump UI');
    return false;
  }

  // Find the clickable parent bounds for a given text
  protected static async findClickableParentBounds(xml: string, text: string): Promise<{ x: number, y: number } | null> {
    try {
      console.log(`Searching for text: "${text}"`);

      // Use regex to find the text node and its bounds
      const textRegex = new RegExp(`text="${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`);
      const textMatch = xml.match(textRegex);

      if (!textMatch) {
        console.log(`Text "${text}" not found in XML`);
        return null;
      }

      console.log(`Found text "${text}" at bounds: [${textMatch[1]},${textMatch[2]}][${textMatch[3]},${textMatch[4]}]`);

      // Now search for the clickable parent by looking for a clickable element that contains this text
      // Look for clickable="true" elements that might be parents
      const clickableRegex = /clickable="true"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g;
      let bestMatch = null;
      let bestOverlap = 0;

      let match;
      while ((match = clickableRegex.exec(xml)) !== null) {
        const clickableX1 = parseInt(match[1]);
        const clickableY1 = parseInt(match[2]);
        const clickableX2 = parseInt(match[3]);
        const clickableY2 = parseInt(match[4]);

        const textX1 = parseInt(textMatch[1]);
        const textY1 = parseInt(textMatch[2]);
        const textX2 = parseInt(textMatch[3]);
        const textY2 = parseInt(textMatch[4]);

        // Check if the clickable element contains or overlaps with the text
        // For banking apps, the text might be positioned outside the clickable bounds
        // but still be part of the same clickable element
        const overlapX = Math.max(0, Math.min(clickableX2, textX2) - Math.max(clickableX1, textX1));
        const overlapY = Math.max(0, Math.min(clickableY2, textY2) - Math.max(clickableY1, textY1));
        const overlapArea = overlapX * overlapY;

        // Also check if the clickable element is close to the text (within reasonable distance)
        const centerX = Math.floor((clickableX1 + clickableX2) / 2);
        const centerY = Math.floor((clickableY1 + clickableY2) / 2);
        const textCenterX = Math.floor((textX1 + textX2) / 2);
        const textCenterY = Math.floor((textY1 + textY2) / 2);

        const distance = Math.sqrt(Math.pow(centerX - textCenterX, 2) + Math.pow(centerY - textCenterY, 2));

        // If there's overlap OR the clickable element is close to the text (within 200 pixels)
        if (overlapArea > 0 || distance < 200) {
          if (overlapArea > bestOverlap || (overlapArea === 0 && bestOverlap === 0 && distance < 200)) {
            bestOverlap = overlapArea;
            bestMatch = {
              x: centerX,
              y: centerY,
              bounds: [clickableX1, clickableY1, clickableX2, clickableY2],
              distance: distance
            };
          }
        }
      }

      if (bestMatch) {
        console.log(`Found clickable parent at coordinates: ${bestMatch.x}, ${bestMatch.y}`);
        console.log(`Clickable parent bounds: [${bestMatch.bounds[0]},${bestMatch.bounds[1]}][${bestMatch.bounds[2]},${bestMatch.bounds[3]}]`);
        console.log(`Distance from text: ${bestMatch.distance} pixels`);
        return { x: bestMatch.x, y: bestMatch.y };
      }

      console.log('No clickable parent found for the text');
      return null;

    } catch (e) {
      console.log('Error parsing XML:', e);
      return null;
    }
  }

  // Parse bounds string to center coordinates
  protected static parseBounds(bounds: string): { x: number, y: number } | null {
    const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (match) {
      const x1 = parseInt(match[1]);
      const y1 = parseInt(match[2]);
      const x2 = parseInt(match[3]);
      const y2 = parseInt(match[4]);
      return {
        x: Math.floor((x1 + x2) / 2),
        y: Math.floor((y1 + y2) / 2)
      };
    }
    return null;
  }

  // Dump UI
  static async dumpUI(filename: string = 'kbank_transfer.xml'): Promise<void> {
    console.log('Dumping UI...');
    await this.runAdbCommand(['shell', 'uiautomator', 'dump']);
    await this.runAdbCommand(['pull', '/sdcard/window_dump.xml', filename]);
    console.log(`UI dump saved to: ${process.cwd()}/${filename}`);
  }

  // Input PIN by clicking number buttons
  static async inputPin(pin: string): Promise<boolean> {
    console.log(`Inputting PIN: ${pin}`);

    // Dump UI to get current state
    await this.runAdbCommand(['shell', 'uiautomator', 'dump']);
    const xml = await this.runAdbCommand(['shell', 'cat', '/sdcard/window_dump.xml']);

    if (!xml) {
      console.log('Failed to get UI hierarchy for PIN input');
      return false;
    }

    // Click each digit in the PIN
    for (let i = 0; i < pin.length; i++) {
      const digit = pin[i];
      console.log(`Clicking digit: ${digit}`);

      // Find and click the digit button
      const digitRegex = new RegExp(`text="${digit}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`);
      const match = xml.match(digitRegex);

      if (match) {
        const x1 = parseInt(match[1]);
        const y1 = parseInt(match[2]);
        const x2 = parseInt(match[3]);
        const y2 = parseInt(match[4]);

        // Click center of the button
        const centerX = Math.floor((x1 + x2) / 2);
        const centerY = Math.floor((y1 + y2) / 2);

        console.log(`Clicking digit ${digit} at coordinates: ${centerX}, ${centerY}`);
        await this.runAdbCommand(['shell', 'input', 'tap', centerX.toString(), centerY.toString()]);

        // Wait a bit between clicks
        await this.delay(500);
      } else {
        console.log(`Could not find digit ${digit} button`);
        return false;
      }
    }

    console.log('PIN input completed');
    return true;
  }

  // Enter PromptPay ID
  static async enterPromptPayId(promptPayId: string): Promise<boolean> {
    console.log(`Entering PromptPay ID: ${promptPayId}`);

    // Dump UI to get current state
    await this.runAdbCommand(['shell', 'uiautomator', 'dump']);
    const xml = await this.runAdbCommand(['shell', 'cat', '/sdcard/window_dump.xml']);

    if (!xml) {
      console.log('Failed to get UI hierarchy for PromptPay ID input');
      return false;
    }

    // Find and click the PromptPay ID input field
    const promptPayFieldRegex = /resource-id="com\.kasikorn\.retail\.mbanking\.wap:id\/plus_pattern_edittext"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/;
    const match = xml.match(promptPayFieldRegex);

    if (match) {
      const x1 = parseInt(match[1]);
      const y1 = parseInt(match[2]);
      const x2 = parseInt(match[3]);
      const y2 = parseInt(match[4]);

      // Click center of the input field to focus it
      const centerX = Math.floor((x1 + x2) / 2);
      const centerY = Math.floor((y1 + y2) / 2);

      console.log(`Clicking PromptPay ID field at coordinates: ${centerX}, ${centerY}`);
      await this.runAdbCommand(['shell', 'input', 'tap', centerX.toString(), centerY.toString()]);

      // Wait a bit for the field to be focused
      await this.delay(1000);

      // Clear the field first (long press to select all, then delete)
      await this.runAdbCommand(['shell', 'input', 'keyevent', 'KEYCODE_CTRL_A']);
      await this.delay(500);
      await this.runAdbCommand(['shell', 'input', 'keyevent', 'KEYCODE_DEL']);
      await this.delay(500);

      // Type the PromptPay ID
      console.log(`Typing PromptPay ID: ${promptPayId}`);
      await this.runAdbCommand(['shell', 'input', 'text', promptPayId]);

      console.log('PromptPay ID entered successfully');
      return true;
    } else {
      console.log('Could not find PromptPay ID input field');
      return false;
    }
  }

  // Click Next button
  static async clickNextButton(): Promise<boolean> {
    console.log('Looking for Next button...');

    // Dump UI to get current state
    await this.runAdbCommand(['shell', 'uiautomator', 'dump']);
    const xml = await this.runAdbCommand(['shell', 'cat', '/sdcard/window_dump.xml']);

    if (!xml) {
      console.log('Failed to get UI hierarchy for Next button');
      return false;
    }

    // Find the Next button by text
    const nextButtonRegex = /text="ต่อไป"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/;
    const match = xml.match(nextButtonRegex);

    if (match) {
      const x1 = parseInt(match[1]);
      const y1 = parseInt(match[2]);
      const x2 = parseInt(match[3]);
      const y2 = parseInt(match[4]);

      // Click center of the button
      const centerX = Math.floor((x1 + x2) / 2);
      const centerY = Math.floor((y1 + y2) / 2);

      console.log(`Clicking Next button at coordinates: ${centerX}, ${centerY}`);
      await this.runAdbCommand(['shell', 'input', 'tap', centerX.toString(), centerY.toString()]);

      console.log('Next button clicked successfully');
      return true;
    } else {
      console.log('Could not find Next button');
      return false;
    }
  }

  // Ensure PromptPay menu is open before entering PromptPay ID
  static async ensurePromptPayMenu(): Promise<boolean> {
    // Dump UI to check if PromptPay ID field is visible
    await this.runAdbCommand(['shell', 'uiautomator', 'dump']);
    const xml = await this.runAdbCommand(['shell', 'cat', '/sdcard/window_dump.xml']);
    if (!xml) return false;
    // Check for PromptPay ID input field
    const promptPayIdFieldRegex = /resource-id="com\.kasikorn\.retail\.mbanking\.wap:id\/plus_pattern_edittext"[^>]*text="ระบุเบอร์มือถือ\/เลขบัตรประชาชน\/เลขประจำตัวผู้เสียภาษี"/;
    if (xml.match(promptPayIdFieldRegex)) {
      console.log('PromptPay ID field is already visible.');
      return true;
    }
    // If not visible, click PromptPay menu option
    console.log('PromptPay ID field not visible, clicking PromptPay menu option...');
    return await this.clickPromptPayMenu();
  }

  // Click PromptPay menu option
  static async clickPromptPayMenu(): Promise<boolean> {
    console.log('Looking for PromptPay menu option...');
    // Dump UI to get current state
    await this.runAdbCommand(['shell', 'uiautomator', 'dump']);
    const xml = await this.runAdbCommand(['shell', 'cat', '/sdcard/window_dump.xml']);
    if (!xml) {
      console.log('Failed to get UI hierarchy for PromptPay menu');
      return false;
    }
    // Find the PromptPay menu option by text
    const promptPayMenuRegex = /text="พร้อมเพย์"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/;
    const match = xml.match(promptPayMenuRegex);
    if (match) {
      const x1 = parseInt(match[1]);
      const y1 = parseInt(match[2]);
      const x2 = parseInt(match[3]);
      const y2 = parseInt(match[4]);
      // Click center of the button
      const centerX = Math.floor((x1 + x2) / 2);
      const centerY = Math.floor((y1 + y2) / 2);
      console.log(`Clicking PromptPay menu option at coordinates: ${centerX}, ${centerY}`);
      await this.runAdbCommand(['shell', 'input', 'tap', centerX.toString(), centerY.toString()]);
      console.log('PromptPay menu option clicked successfully');
      return true;
    } else {
      console.log('Could not find PromptPay menu option');
      return false;
    }
  }

  // Input amount by clicking number buttons on custom keyboard
  static async inputAmount(amount: string): Promise<boolean> {
    console.log(`Inputting amount: ${amount}`);

    // Dump UI to get current state
    await this.runAdbCommand(['shell', 'uiautomator', 'dump']);
    const xml = await this.runAdbCommand(['shell', 'cat', '/sdcard/window_dump.xml']);

    if (!xml) {
      console.log('Failed to get UI hierarchy for amount input');
      return false;
    }

    // Click each digit in the amount
    for (let i = 0; i < amount.length; i++) {
      const digit = amount[i];
      console.log(`Clicking digit: ${digit}`);

      // Find and click the digit button on the custom keyboard
      // Try content-desc first (for custom keyboard buttons)
      const digitRegex = new RegExp(`content-desc="${digit} "[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`);
      let match = xml.match(digitRegex);

      // If not found with content-desc, try text attribute
      if (!match) {
        const textRegex = new RegExp(`text="${digit}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`);
        match = xml.match(textRegex);
      }

      if (match) {
        const x1 = parseInt(match[1]);
        const y1 = parseInt(match[2]);
        const x2 = parseInt(match[3]);
        const y2 = parseInt(match[4]);

        // Click center of the button
        const centerX = Math.floor((x1 + x2) / 2);
        const centerY = Math.floor((y1 + y2) / 2);

        console.log(`Clicking digit ${digit} at coordinates: ${centerX}, ${centerY}`);
        await this.runAdbCommand(['shell', 'input', 'tap', centerX.toString(), centerY.toString()]);

        // Wait a bit between clicks
        await this.delay(500);
      } else {
        console.log(`Could not find digit ${digit} button on custom keyboard`);
        return false;
      }
    }

    console.log('Amount input completed');
    return true;
  }

  // Click Done button on custom keyboard
  static async clickDoneButton(): Promise<boolean> {
    console.log('Looking for Done button on custom keyboard...');

    // Dump UI to get current state
    await this.runAdbCommand(['shell', 'uiautomator', 'dump']);
    const xml = await this.runAdbCommand(['shell', 'cat', '/sdcard/window_dump.xml']);

    if (!xml) {
      console.log('Failed to get UI hierarchy for Done button');
      return false;
    }

    // Find the Done button by content-desc (as seen in previous logs)
    const doneButtonRegex = /content-desc="Done "[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/;
    const match = xml.match(doneButtonRegex);

    if (match) {
      const x1 = parseInt(match[1]);
      const y1 = parseInt(match[2]);
      const x2 = parseInt(match[3]);
      const y2 = parseInt(match[4]);

      // Click center of the button
      const centerX = Math.floor((x1 + x2) / 2);
      const centerY = Math.floor((y1 + y2) / 2);

      console.log(`Clicking Done button at coordinates: ${centerX}, ${centerY}`);
      await this.runAdbCommand(['shell', 'input', 'tap', centerX.toString(), centerY.toString()]);

      console.log('Done button clicked successfully');
      return true;
    } else {
      console.log('Could not find Done button');
      return false;
    }
  }

  // Main transfer method
  static async performTransfer(pin: string, promptPayId: string, amount: string = '1'): Promise<void> {
    try {
      console.log('Starting KBank transfer automation...');
      console.log(`PIN: ${pin.replace(/./g, '*')}`); // Mask PIN for security
      console.log(`PromptPay ID: ${promptPayId}`);
      console.log(`Amount: ${amount}`);

      // Open K PLUS app
      await this.openKPlusApp();

      // Click transfer button
      const transferClicked = await this.clickTransferButton();
      if (!transferClicked) {
        console.log('Failed to click transfer button');
        return;
      }

      // Wait for PIN screen to appear
      console.log('Waiting for PIN screen...');
      await this.delay(3000);

      // Input PIN
      const pinInputSuccess = await this.inputPin(pin);
      if (!pinInputSuccess) {
        console.log('Failed to input PIN');
        return;
      }

      // Wait for PromptPay screen to appear
      console.log('Waiting for PromptPay screen...');
      await this.delay(3000);

      // Ensure PromptPay menu is open before entering PromptPay ID
      await this.ensurePromptPayMenu();

      // Enter PromptPay ID
      const promptPaySuccess = await this.enterPromptPayId(promptPayId);
      if (!promptPaySuccess) {
        console.log('Failed to enter PromptPay ID');
        return;
      }

      // Wait a bit for the input to be processed
      await this.delay(2000);

      // Click Next button
      const nextButtonSuccess = await this.clickNextButton();
      if (!nextButtonSuccess) {
        console.log('Failed to click Next button');
        return;
      }

      // Wait for amount input screen to appear
      console.log('Waiting for amount input screen...');
      await this.delay(3000);

      // Input amount by clicking digits on custom keyboard
      const amountInputSuccess = await this.inputAmount(amount);
      if (!amountInputSuccess) {
        console.log('Failed to input amount');
        return;
      }

      // Click Done button on custom keyboard
      const doneButtonSuccess = await this.clickDoneButton();
      if (!doneButtonSuccess) {
        console.log('Failed to click Done button on custom keyboard');
        return;
      }

      // Wait a bit for the amount to be processed
      await this.delay(2000);

      // Click Next button again to proceed with transfer
      const finalNextButtonSuccess = await this.clickNextButton();
      if (!finalNextButtonSuccess) {
        console.log('Failed to click final Next button');
        return;
      }

      console.log('Transfer automation completed successfully!');

    } catch (error) {
      console.log(`Transfer automation failed: ${error}`);
    }
  }

  // Delay helper
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}