import 'dart:io';

class AndroidAutomation {
  // Check connected devices
  static Future<void> listDevices() async {
    print('Checking connected devices...');
    await _runAdbCommand(['devices']);
  }

  // Open Chrome browser
  static Future<void> openChrome() async {
    print('Opening Chrome...');
    await _runAdbCommand([
      'shell',
      'am',
      'start',
      '-n',
      'com.android.chrome/com.google.android.apps.chrome.Main',
    ]);
    await Future.delayed(Duration(seconds: 3));
  }

  // Dump UI hierarchy and find elements
  static Future<String> dumpUI() async {
    print('Dumping UI hierarchy...');
    final result = await Process.run('adb', ['shell', 'uiautomator', 'dump']);
    if (result.exitCode == 0) {
      // Get the XML file content
      final xmlResult = await Process.run('adb', [
        'shell',
        'cat',
        '/sdcard/window_dump.xml',
      ]);
      return xmlResult.stdout.toString();
    }
    return '';
  }

  // Find element by text and tap it
  static Future<void> tapElementByText(String text) async {
    print('Finding element with text: $text');
    await _runAdbCommand([
      'shell',
      'uiautomator',
      'runtest',
      'local',
      '-c',
      'new UiObject(new UiSelector().text("$text")).click()',
    ]);
  }

  // Search using UI Automator with element finding
  static Future<void> searchGoogleUIAutomator(String query) async {
    print('Searching with UI Automator...');

    // Open Google
    await _runAdbCommand([
      'shell',
      'am',
      'start',
      '-a',
      'android.intent.action.VIEW',
      '-d',
      'https://www.google.com',
    ]);

    await Future.delayed(Duration(seconds: 4));

    // Dump UI to analyze elements
    await dumpUI();

    // Click on search EditText using bounds from UI dump
    print('Clicking search box using UI bounds...');
    await _runAdbCommand([
      'shell',
      'input',
      'tap',
      '476',
      '737',
    ]); // Center of EditText bounds [168,703][784,771]

    await Future.delayed(Duration(seconds: 1));

    // Type search query
    print('Typing: $query');
    await _runAdbCommand([
      'shell',
      'input',
      'text',
      query.replaceAll(' ', '%s'),
    ]);

    await Future.delayed(Duration(seconds: 1));

    // Press Enter
    print('Pressing Enter...');
    await _runAdbCommand(['shell', 'input', 'keyevent', 'KEYCODE_ENTER']);
  }

  // Alternative: Use resource-id to find elements
  static Future<void> searchByResourceId(String query) async {
    print('Searching using resource-id...');

    await _runAdbCommand([
      'shell',
      'am',
      'start',
      '-a',
      'android.intent.action.VIEW',
      '-d',
      'https://www.google.com',
    ]);

    await Future.delayed(Duration(seconds: 4));

    // Click on search form using resource-id 'tsf'
    await _runAdbCommand([
      'shell',
      'input',
      'tap',
      '540',
      '737',
    ]); // SearchView center

    await Future.delayed(Duration(seconds: 1));

    await _runAdbCommand([
      'shell',
      'input',
      'text',
      query.replaceAll(' ', '%s'),
    ]);
    await _runAdbCommand(['shell', 'input', 'keyevent', 'KEYCODE_ENTER']);
  }

  // Search using keyboard navigation
  static Future<void> searchGoogleKeyboard(String query) async {
    print('Searching with keyboard navigation...');

    await _runAdbCommand([
      'shell',
      'am',
      'start',
      '-a',
      'android.intent.action.VIEW',
      '-d',
      'https://www.google.com',
    ]);

    await Future.delayed(Duration(seconds: 4));

    // Use Tab to navigate to search box
    await _runAdbCommand(['shell', 'input', 'keyevent', 'KEYCODE_TAB']);
    await _runAdbCommand(['shell', 'input', 'keyevent', 'KEYCODE_TAB']);

    // Type and search
    await _runAdbCommand([
      'shell',
      'input',
      'text',
      query.replaceAll(' ', '%s'),
    ]);
    await _runAdbCommand(['shell', 'input', 'keyevent', 'KEYCODE_ENTER']);
  }

  // Navigate to Google and search
  static Future<void> searchGoogle(String query) async {
    print('Navigating to Google...');

    // Open Google URL
    await _runAdbCommand([
      'shell',
      'am',
      'start',
      '-a',
      'android.intent.action.VIEW',
      '-d',
      'https://www.google.com',
    ]);

    await Future.delayed(Duration(seconds: 4));

    // Tap on search box (1080x2400 display)
    print('Tapping search box...');
    await _runAdbCommand(['shell', 'input', 'tap', '540', '600']);

    await Future.delayed(Duration(seconds: 1));

    // Type search query
    print('Typing: $query');
    await _runAdbCommand([
      'shell',
      'input',
      'text',
      query.replaceAll(' ', '%s'),
    ]);

    await Future.delayed(Duration(seconds: 1));

    // Press Enter
    print('Pressing Enter...');
    await _runAdbCommand(['shell', 'input', 'keyevent', 'KEYCODE_ENTER']);
  }

  // Additional utility methods
  static Future<void> goBack() async {
    await _runAdbCommand(['shell', 'input', 'keyevent', 'KEYCODE_BACK']);
  }

  static Future<void> goHome() async {
    await _runAdbCommand(['shell', 'input', 'keyevent', 'KEYCODE_HOME']);
  }

  // Execute ADB command
  static Future<void> _runAdbCommand(List<String> args) async {
    try {
      final result = await Process.run('adb', args);
      if (result.stdout.toString().isNotEmpty) {
        print(result.stdout);
      }
      if (result.stderr.toString().isNotEmpty) {
        print('Error: ${result.stderr}');
      }
    } catch (e) {
      print('Failed to execute ADB command: $e');
    }
  }
}

void main() async {
  print('=== Android Automation POC ===\n');

  await AndroidAutomation.listDevices();
  await Future.delayed(Duration(seconds: 2));

  // Method: UI Automator element-based
  print('\n--- UI Automator Method ---');
  await AndroidAutomation.openChrome();
  await AndroidAutomation.searchGoogleUIAutomator('flutter development');

  print('\nCompleted!');
}
