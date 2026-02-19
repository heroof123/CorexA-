// src/test/mocks/tauri.ts
// Mock Tauri API for testing

export async function invoke(cmd: string, args?: any): Promise<any> {
  console.log(`[Mock Tauri] ${cmd}`, args);
  
  // Mock specific commands
  switch (cmd) {
    case 'git_log_file':
      return JSON.stringify([
        {
          hash: 'abc123',
          author: 'Test User',
          date: '2024-01-01',
          message: 'Test commit',
        },
      ]);
    
    case 'git_blame':
      return JSON.stringify([
        {
          line: 1,
          hash: 'abc123',
          author: 'Test User',
          date: '2024-01-01',
        },
      ]);
    
    case 'read_file':
      return 'function test() { return 42; }';
    
    case 'write_file':
      return null;
    
    default:
      return null;
  }
}

export async function open(options?: any): Promise<string | null> {
  return '/mock/path';
}

export const dialog = {
  open,
};
