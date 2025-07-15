"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchAutomation = void 0;
const automation_1 = require("./automation");
class SearchAutomation extends automation_1.AndroidAutomation {
    // Smart search using element detection with multiple strategies
    static async smartSearch(query) {
        console.log(`\n🔍 Smart Search: "${query}"`);
        // Open Google
        await this.runAdbCommand([
            'shell', 'am', 'start', '-a', 'android.intent.action.VIEW',
            '-d', 'https://www.google.com'
        ]);
        await this.delay(4000);
        // Strategy 1: Try Google search box by resource-id
        let success = await this.clickByResourceId('tsf');
        // Strategy 2: Try Chrome address bar
        if (!success) {
            success = await this.clickByResourceId('com.android.chrome:id/url_bar');
        }
        // Strategy 3: Try any EditText element
        if (!success) {
            success = await this.clickByClass('android.widget.EditText');
        }
        // Strategy 4: Try search button
        if (!success) {
            success = await this.clickByContentDesc('ค้นหาด้วย Google');
        }
        // Strategy 5: Try clicking center of search area
        if (!success) {
            console.log('Trying center search area...');
            await this.runAdbCommand(['shell', 'input', 'tap', '540', '737']);
            success = true;
        }
        if (success) {
            await this.delay(1000);
            console.log(`✅ Typing: "${query}"`);
            await this.runAdbCommand(['shell', 'input', 'text', query.replace(/ /g, '%s')]);
            await this.delay(1000);
            console.log('🚀 Executing search...');
            await this.runAdbCommand(['shell', 'input', 'keyevent', 'KEYCODE_ENTER']);
            await this.delay(3000);
            console.log(`✅ Search completed for: "${query}"`);
        }
        else {
            console.log('❌ Could not find search interface');
        }
    }
    // Search with voice
    static async voiceSearch() {
        console.log('\n🎤 Voice Search');
        await this.runAdbCommand([
            'shell', 'am', 'start', '-a', 'android.intent.action.VIEW',
            '-d', 'https://www.google.com'
        ]);
        await this.delay(4000);
        const clicked = await this.clickByResourceId('Q7Ulpb') ||
            await this.clickByContentDesc('ค้นหาด้วยเสียง');
        if (clicked) {
            console.log('✅ Voice search activated');
        }
        else {
            console.log('❌ Voice search not found');
        }
    }
}
exports.SearchAutomation = SearchAutomation;
