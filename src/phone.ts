import { AndroidAutomation } from './automation';

export class PhoneAutomation extends AndroidAutomation {
  // Debug method to show available elements
  static async debugDialpad(): Promise<void> {
    console.log('\n🔍 Debugging dialpad elements...');
    const xml = await this.dumpUI();
    
    // Look for common dialpad patterns
    const patterns = [
      /resource-id="[^"]*digit[^"]*"/g,
      /resource-id="[^"]*[0-9][^"]*"/g,
      /content-desc="[^"]*[0-9][^"]*"/g,
      /text="[0-9]"/g
    ];
    
    console.log('Found potential dialpad elements:');
    patterns.forEach((pattern, index) => {
      const matches = xml.match(pattern);
      if (matches) {
        console.log(`Pattern ${index + 1}:`, matches.slice(0, 10)); // Show first 10 matches
      }
    });
  }
  // Helper method to click digit using direct coordinates from UI dump
  private static async clickDigit(digit: string): Promise<boolean> {
    console.log(`Trying to click digit: ${digit}`);
    
    // Direct coordinates based on UI dump bounds (center of each button)
    const digitCoordinates: { [key: string]: { x: number, y: number } } = {
      '1': { x: 193, y: 1459 }, // bounds="[32,1375][355,1543]"
      '2': { x: 539, y: 1459 }, // bounds="[377,1375][701,1543]"
      '3': { x: 885, y: 1459 }, // bounds="[723,1375][1047,1543]"
      '4': { x: 193, y: 1649 }, // bounds="[32,1565][355,1733]"
      '5': { x: 539, y: 1649 }, // bounds="[377,1565][701,1733]"
      '6': { x: 885, y: 1649 }, // bounds="[723,1565][1047,1733]"
      '7': { x: 193, y: 1839 }, // bounds="[32,1755][355,1923]"
      '8': { x: 539, y: 1839 }, // bounds="[377,1755][701,1923]"
      '9': { x: 885, y: 1839 }, // bounds="[723,1755][1047,1923]"
      '0': { x: 539, y: 2029 }  // bounds="[377,1945][701,2113]"
    };
    
    const coords = digitCoordinates[digit];
    if (coords) {
      console.log(`Clicking digit ${digit} at coordinates (${coords.x}, ${coords.y})`);
      await this.runAdbCommand(['shell', 'input', 'tap', coords.x.toString(), coords.y.toString()]);
      console.log(`✅ Clicked digit ${digit}`);
      return true;
    }
    
    console.log(`❌ No coordinates found for digit: ${digit}`);
    return false;
  }
  // Make a phone call using element detection
  static async makeCall(phoneNumber: string): Promise<void> {
    // Debug dialpad elements first
    await this.debugDialpad();
    console.log(`\n📞 Making call to: ${phoneNumber}`);
    
    // Open Phone app
    await this.runAdbCommand([
      'shell', 'am', 'start', '-a', 'android.intent.action.CALL_BUTTON'
    ]);

    await this.delay(3000);

    // Try different strategies to find dialer
    let success = await this.clickByResourceId('com.google.android.dialer:id/dialpad_fab') ||
                 await this.clickByContentDesc('key pad');
    
    // If element detection fails, use direct coordinates for the floating action button
    if (!success) {
      console.log('Trying direct coordinates for dialpad button...');
      await this.runAdbCommand(['shell', 'input', 'tap', '943', '1989']); // Center of [870,1916][1017,2063]
      success = true;
    }

    if (success) {
      await this.delay(1000);
      
      // Type phone number
      console.log(`✅ Typing number: ${phoneNumber}`);
      for (const digit of phoneNumber) {
        if (digit >= '0' && digit <= '9') {
          await PhoneAutomation.clickDigit(digit);
          await this.delay(300);
        }
      }
      
      await this.delay(1000);
      
      // Click call button using direct coordinates from UI dump
      // bounds="[413,2158][667,2305]" -> center at (540, 2231)
      console.log('Clicking call button at coordinates (540, 2231)');
      await this.runAdbCommand(['shell', 'input', 'tap', '540', '2231']);
      let callClicked = true;
      
      if (callClicked) {
        console.log('🚀 Initiating call...');
        await this.delay(2000);
        console.log(`✅ Call initiated to: ${phoneNumber}`);
      } else {
        console.log('❌ Could not find call button');
      }
    } else {
      console.log('❌ Could not open dialer');
    }
  }

  // End current call
  static async endCall(): Promise<void> {
    console.log('\n📵 Ending call...');
    
    const ended = await this.clickByResourceId('com.android.dialer:id/incall_end_call') ||
                 await this.clickByContentDesc('End call') ||
                 await this.clickByText('End');
    
    if (ended) {
      console.log('✅ Call ended');
    } else {
      console.log('❌ Could not end call');
    }
  }

  // Open contacts
  static async openContacts(): Promise<void> {
    console.log('\n👥 Opening contacts...');
    
    await this.runAdbCommand([
      'shell', 'am', 'start', '-a', 'android.intent.action.VIEW',
      '-t', 'vnd.android.cursor.dir/contact'
    ]);

    await this.delay(2000);
    console.log('✅ Contacts opened');
  }

  // Call a contact by name
  static async callContact(contactName: string): Promise<void> {
    console.log(`\n📞 Calling contact: ${contactName}`);
    
    await this.openContacts();
    await this.delay(2000);
    
    // Search for contact
    const searchClicked = await this.clickByResourceId('com.android.contacts:id/search_view') ||
                         await this.clickByContentDesc('Search') ||
                         await this.clickByClass('android.widget.EditText');
    
    if (searchClicked) {
      await this.delay(500);
      await this.runAdbCommand(['shell', 'input', 'text', contactName.replace(/ /g, '%s')]);
      await this.delay(1000);
      
      // Click on first contact result
      const contactClicked = await this.clickByText(contactName) ||
                            await this.clickByClass('android.widget.TextView');
      
      if (contactClicked) {
        await this.delay(1000);
        
        // Click call button
        const callClicked = await this.clickByContentDesc('Call') ||
                           await this.clickByResourceId('com.android.contacts:id/call_button');
        
        if (callClicked) {
          console.log(`✅ Calling ${contactName}...`);
        } else {
          console.log('❌ Could not find call button for contact');
        }
      } else {
        console.log(`❌ Contact '${contactName}' not found`);
      }
    } else {
      console.log('❌ Could not find search in contacts');
    }
  }
}