import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class ScreenDump {
  // Dump screen and save XML to file
  static async dumpScreen(outputFile: string = 'screen_dump.xml'): Promise<void> {
    console.log('Dumping current screen...');
    
    // Dump UI hierarchy
    await this.runAdbCommand(['shell', 'uiautomator', 'dump']);
    
    // Pull the XML file to local machine
    await this.runAdbCommand(['pull', '/sdcard/window_dump.xml', outputFile]);
    
    console.log(`Screen dump saved to: ${process.cwd()}/${outputFile}`);
  }

  // Get current activity info
  static async getCurrentActivity(): Promise<void> {
    console.log('Getting current activity...');
    await this.runAdbCommand(['shell', 'dumpsys', 'activity', 'activities', '|', 'grep', 'mResumedActivity']);
  }

  // Check current app package name
  static async getCurrentApp(): Promise<void> {
    console.log('Getting current app...');
    await this.runAdbCommand(['shell', 'cmd', 'activity', 'get-current']);
  }

  // Alternative method to get current app
  static async getCurrentPackage(): Promise<void> {
    console.log('Getting current package (alternative)...');
    await this.runAdbCommand(['shell', 'dumpsys', 'activity', 'top']);
  }

  // Take screenshot
  static async takeScreenshot(outputFile: string = 'screenshot.png'): Promise<void> {
    console.log('Taking screenshot...');
    await this.runAdbCommand(['shell', 'screencap', '/sdcard/screenshot.png']);
    await this.runAdbCommand(['pull', '/sdcard/screenshot.png', outputFile]);
    console.log(`Screenshot saved to: ${process.cwd()}/${outputFile}`);
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

  // Complete screen analysis
  static async analyzeScreen(): Promise<void> {
    console.log('=== Complete Screen Analysis ===\n');
    
    await this.getCurrentApp();
    await this.getCurrentPackage();
    await this.takeScreenshot();
    await this.dumpScreen();
    
    console.log('\nAnalysis complete! Check the generated files.');
  }
}