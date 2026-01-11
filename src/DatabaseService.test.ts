import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { DatabaseService } from './DatabaseService';
import { 
  ref, 
  set, 
  get, 
  remove, 
  update, 
  onValue, 
  push, 
  query, 
  onDisconnect
} from 'firebase/database';
import type { User } from 'firebase/auth';

// ==========================================
// Mocks
// ==========================================

vi.mock('firebase/database', () => {
  // Mock push to act as both a synchronous reference generator (for createCategory)
  // and a thenable promise (for createWorker which awaits it).
  const pushMock = vi.fn().mockImplementation(() => {
    const mockKey = 'mock-key-' + Math.random().toString(36).substr(2, 9);
    
    // The object we resolve to must NOT have a .then method, 
    // otherwise 'await' will keep trying to unwrap it infinitely.
    const safeResolution = { key: mockKey };

    const mockRef = {
      key: mockKey,
      // Implement .then to allow 'await push(...)' to resolve.
      // Crucial: Resolve to 'safeResolution', NOT 'mockRef'.
      then: (resolve: (val: any) => void, reject: (err: any) => void) => {
        return Promise.resolve(safeResolution).then(resolve, reject);
      },
      catch: (reject: (err: any) => void) => {
        return Promise.resolve(safeResolution).catch(reject);
      }
    };
    return mockRef;
  });
  
  return {
    getDatabase: vi.fn(() => ({ app: 'MOCK_APP' })), // Return a mock DB object so 'db' is not undefined
    // Return a mock object so expects needing a 'ref' don't get undefined
    ref: vi.fn(() => ({ key: 'mock-ref-path' })), 
    set: vi.fn(),
    get: vi.fn(),
    remove: vi.fn(),
    update: vi.fn(),
    onValue: vi.fn(),
    push: pushMock,
    query: vi.fn(),
    orderByChild: vi.fn(),
    limitToLast: vi.fn(),
    serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
    onDisconnect: vi.fn(() => ({
      remove: vi.fn(),
      cancel: vi.fn()
    }))
  };
});

describe('DatabaseService', () => {
  const mockUser = {
    uid: 'user123',
    displayName: 'Test User',
    photoURL: 'http://example.com/photo.jpg'
  } as User;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Subscriptions', () => {
    it('subscribeToBoardData calls onValue', () => {
      const cb = vi.fn();
      DatabaseService.subscribeToBoardData(cb);
      expect(onValue).toHaveBeenCalled();
      expect(ref).toHaveBeenCalledWith(expect.anything(), 'boarddata');
    });

    it('subscribeToCategories calls onValue', () => {
      const cb = vi.fn();
      DatabaseService.subscribeToCategories(cb);
      expect(onValue).toHaveBeenCalled();
      expect(ref).toHaveBeenCalledWith(expect.anything(), 'categories');
    });
  });

  describe('Note Operations', () => {
    it('createNote pushes new note', async () => {
      const note = { text: 'test', column: 0, position: 0 };
      await DatabaseService.createNote('w1', note);
      expect(push).toHaveBeenCalled();
      expect(set).toHaveBeenCalledWith(expect.anything(), note);
    });

    it('updateNoteText sets new text', async () => {
      await DatabaseService.updateNoteText('w1', 'n1', 'new text');
      expect(set).toHaveBeenCalledWith(expect.anything(), 'new text');
    });

    it('deleteNote removes note', async () => {
      await DatabaseService.deleteNote('w1', 'n1');
      expect(remove).toHaveBeenCalled();
    });
  });

  describe('Worker Operations', () => {
    it('createWorker pushes new worker', async () => {
      await DatabaseService.createWorker('Dave', 'Red');
      expect(push).toHaveBeenCalled();
    });

    it('deleteWorker removes worker', async () => {
      await DatabaseService.deleteWorker('w1');
      expect(remove).toHaveBeenCalled();
    });
  });

  describe('Category Operations', () => {
    it('createCategory creates category and returns key', async () => {
      const name = 'New Category';
      // Execute
      const result = await DatabaseService.createCategory(name);

      // Verification
      // 1. push called to generate key (arg 1 is the ref)
      expect(push).toHaveBeenCalled();
      
      // 2. set called with the ref from push, and the data
      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({ key: result }),
        { name, items: [], color: 'Green' }
      );
      
      // 3. result matches the key format
      expect(result).toMatch(/^mock-key-/);
    });

    it('updateCategory updates fields', async () => {
      await DatabaseService.updateCategory('cat1', { color: 'Red' });
      expect(update).toHaveBeenCalledWith(
        expect.anything(),
        { color: 'Red' }
      );
    });

    it('deleteCategory removes category', async () => {
      await DatabaseService.deleteCategory('cat1');
      expect(remove).toHaveBeenCalled();
    });
  });

  describe('Lock Operations', () => {
    it('acquireLock sets lock with timestamp', async () => {
      await DatabaseService.acquireLock('n1', mockUser);
      expect(set).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ userId: mockUser.uid })
      );
      expect(onDisconnect).toHaveBeenCalled();
    });

    it('releaseLock removes lock', async () => {
      await DatabaseService.releaseLock('n1');
      expect(remove).toHaveBeenCalled();
    });
  });

  describe('Snapshot Operations', () => {
    it('saveSnapshot pushes new snapshot and prunes old ones', async () => {
      // Mock get to return many snapshots
      const snapshots: Record<string, any> = {};
      for (let i = 0; i < 105; i++) {
        snapshots[`snap_${i}`] = { timestamp: i };
      }

      (get as Mock).mockResolvedValue({ 
        exists: () => true,
        val: () => snapshots
      });

      await DatabaseService.saveSnapshot(mockUser, 'Save', {}, {});

      expect(update).toHaveBeenCalledTimes(1); // One for prune
      const updateCall = (update as Mock).mock.calls[0];
      const updatesArg = updateCall[1];
      
      // Should prune 105 - 99 = 6 items
      expect(Object.keys(updatesArg).length).toBe(6);
      expect(push).toHaveBeenCalled();
    });

    it('deleteSnapshot removes snapshot', async () => {
      await DatabaseService.deleteSnapshot('snap1');
      expect(remove).toHaveBeenCalled();
    });

    it('restoreBackup overwrites boardData and categories', async () => {
      await DatabaseService.restoreBackup({}, {});
      expect(set).toHaveBeenCalledTimes(2);
    });
  });
});