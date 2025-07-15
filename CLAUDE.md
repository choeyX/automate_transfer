# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the automate_transfer project.

## Development Commands

- `npm run build` - Compile TypeScript to JavaScript (output in `dist/`)
- `npm run start` - Run the compiled application from `dist/index.js`
- `npm run dev` - Run the application directly with ts-node

### Available Actions

- `npm run dev search "query"` - Perform web search automation
- `npm run dev call "phone_number"` - Make phone call
- `npm run dev contact "contact_name"` - Call contact by name
- `npm run dev voice` - Voice search automation
- `npm run dev dump` - Analyze screen UI
- `npm run dev transfer <PIN> <PromptPayID> [amount]` - Banking transfer automation

## Project Structure

This is a TypeScript/Node.js project with the following architecture:

- **Main entry point**: `src/index.ts` - Contains the main automation class and CLI interface
- **Core automation**: `src/automation.ts` - Base Android automation utilities using ADB
- **Specialized modules**:
  - `src/search.ts` - Web search automation
  - `src/phone.ts` - Phone call automation
  - `src/screen-dump.ts` - UI analysis utilities
  - `src/transfer-kbank.ts` - Banking application automation

## Technical Details

- **Runtime**: Node.js with TypeScript
- **Dependencies**: xml2js for XML parsing, ADB for Android device interaction
- **Build system**: TypeScript compiler with ES2020 target
- **Architecture**: Static class-based design with async/await patterns

## Development Notes

- The project uses ADB (Android Debug Bridge) for device automation
- UI elements are located by parsing XML from `uiautomator dump`
- All automation methods include error handling and logging
- The main CLI supports various action modes: search, call, contact, voice, dump, transfer

## Security Considerations

This project automates mobile applications and requires appropriate permissions and user consent for any automation activities.