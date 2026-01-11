import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
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
  onDisconnect,
  serverTimestamp 
} from 'firebase/database';
import type { User } from 'firebase/auth';

// ==========================================
// Mocks
// ==========================================

// Mock Firebase Database
vi.mock('firebase/database', () => {
  const pushMock = vi.fn();
  // push needs to return a Promise-like object that also has a 'key' property immediately? 
  // Or just a promise that resolves? In Firebase JS SDK, push returns a ThenableReference.
  // We'll mock it to return a Promise that resolves to a ref, and has a .key property.
  // Ideally, the code awaits push, or uses the returned ref.
  
  return {
    ref: vi.fn(),
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
    onDisconnect: vi.fn(),
    getDatabase: vi.fn(),
  };
});

// Mock Firebase App (needed if DatabaseService imports 'db' which initializes the app)
vi.mock('./firebase', () => ({
  db: {}, // Mock database instance
}));

describe('DatabaseService', () => {
  const mockUser = {
    uid: 'user123',
    displayName: 'Test User',
    photoURL: 'http://example.com/photo.jpg',
  } as User;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock behaviors
    (ref as Mock).mockImplementation((_db, path) => ({ key: path, toString: () => path }));
    
    // push needs to simulate returning a new Ref with a generated key
    (push as Mock).mockImplementation((parentRef, data) => {
      const newRef = { key: 'generated-key' };
      // If data is provided, push returns a promise. If not, it just returns the ref.
      // DatabaseService usage:
      // 1. const newRef = push(ref(...)); await set(newRef, ...);
      // 2. await push(ref(...), data);
      
      // We'll support both via a hybrid mock if needed, but for now let's assume standard behavior:
      const promise = Promise.resolve(newRef);
      Object.assign(promise, newRef); // Make it "ThenableReference"
      return promise;
    });

    (set as Mock).mockResolvedValue(undefined);
    (update as Mock).mockResolvedValue(undefined);
    (remove as Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================
  // Data Subscriptions
  // ==========================================
  describe('Subscriptions', () => {
    it('subscribeToBoardData attaches onValue listener', () => {
      const callback = vi.fn();
      DatabaseService.subscribeToBoardData(callback);
      
      expect(ref).toHaveBeenCalledWith(expect.anything(), 'boarddata');
      expect(onValue).toHaveBeenCalled();
      
      // Simulate callback
      const mockSnapshot = { val: () => ({ worker1: {} }) };
      const onValueCallback = (onValue as Mock).mock.calls[0][1];
      onValueCallback(mockSnapshot);
      expect(callback).toHaveBeenCalledWith({ worker1: {} });
    });

    it('subscribeToCategories attaches onValue listener', () => {
      const callback = vi.fn();
      DatabaseService.subscribeToCategories(callback);
      expect(ref).toHaveBeenCalledWith(expect.anything(), 'categories');
      expect(onValue).toHaveBeenCalled();
    });

    it('subscribeToLocks attaches onValue listener', () => {
      const callback = vi.fn();
      DatabaseService.subscribeToLocks(callback);
      expect(ref).toHaveBeenCalledWith(expect.anything(), 'locks');
      expect(onValue).toHaveBeenCalled();
    });

    it('subscribeToPresence attaches onValue listener', () => {
      const callback = vi.fn();
      DatabaseService.subscribeToPresence(callback);
      expect(ref).toHaveBeenCalledWith(expect.anything(), 'presence');
      expect(onValue).toHaveBeenCalled();
    });

    it('subscribeToSnapshots attaches onValue listener with query', () => {
      const callback = vi.fn();
      DatabaseService.subscribeToSnapshots(callback);
      
      expect(ref).toHaveBeenCalledWith(expect.anything(), 'snapshots');
      expect(query).toHaveBeenCalled();
      expect(onValue).toHaveBeenCalled();
    });
  });

  // ==========================================
  // Note Operations
  // ==========================================
  describe('Note Operations', () => {
    it('getNote retrieves a single note', async () => {
      const mockNote = { text: 'Hello' };
      (get as Mock).mockResolvedValue({
        exists: () => true,
        val: () => mockNote
      });

      const result = await DatabaseService.getNote('w1', 'n1');
      
      expect(ref).toHaveBeenCalledWith(expect.anything(), 'boarddata/w1/notes/n1');
      expect(result).toEqual(mockNote);
    });

    it('getNote returns null if not found', async () => {
      (get as Mock).mockResolvedValue({ exists: () => false });
      const result = await DatabaseService.getNote('w1', 'n1');
      expect(result).toBeNull();
    });

    it('createNote pushes new note and returns key', async () => {
      const noteData = { text: 'New Note', column: 0, position: 0 };
      const result = await DatabaseService.createNote('w1', noteData);
      
      expect(push).toHaveBeenCalled(); // Should be called on boarddata/w1/notes
      expect(set).toHaveBeenCalledWith(expect.objectContaining({ key: 'generated-key' }), noteData);
      expect(result).toBe('generated-key');
    });

    it('addNote sets note at specific ID', async () => {
      const noteData = { text: 'Specific Note', column: 0, position: 0 };
      await DatabaseService.addNote('w1', 'n1', noteData);
      expect(set).toHaveBeenCalledWith(expect.anything(), noteData);
    });

    it('deleteNote removes note', async () => {
      await DatabaseService.deleteNote('w1', 'n1');
      expect(remove).toHaveBeenCalled();
    });

    it('updateNoteText updates only text field', async () => {
      await DatabaseService.updateNoteText('w1', 'n1', 'Updated Text');
      expect(set).toHaveBeenCalledWith(expect.anything(), 'Updated Text'); 
      // Note: Implementation uses set on specific path /text
      // Verify ref path if possible, or just the call
      const refCall = (ref as Mock).mock.calls.find(call => call[1] === 'boarddata/w1/notes/n1/text');
      expect(refCall).toBeTruthy();
    });

    it('updateNoteColor updates only color field', async () => {
      await DatabaseService.updateNoteColor('w1', 'n1', 'Red');
      const refCall = (ref as Mock).mock.calls.find(call => call[1] === 'boarddata/w1/notes/n1/color');
      expect(refCall).toBeTruthy();
    });

    it('updateNoteCategory updates category and color', async () => {
      await DatabaseService.updateNoteCategory('w1', 'n1', 'Cat1', 'Blue');
      expect(update).toHaveBeenCalledWith(
        expect.anything(), 
        { categoryName: 'Cat1', color: 'Blue' }
      );
    });

    it('moveNote sets new note and removes old one', async () => {
      const noteData = { text: 'Moving', column: 1, position: 100 };
      await DatabaseService.moveNote('n1', 'w1', 'w2', noteData);
      
      // Should set in w2
      const setCall = (set as Mock).mock.calls.find(c => c[0].key === 'boarddata/w2/notes/n1');
      expect(setCall).toBeTruthy();
      
      // Should remove from w1 (since w1 != w2)
      const removeCall = (remove as Mock).mock.calls.find(c => c[0].key === 'boarddata/w1/notes/n1');
      expect(removeCall).toBeTruthy();
    });

    it('moveNote does NOT remove if worker is same', async () => {
      const noteData = { text: 'Moving', column: 1, position: 100 };
      await DatabaseService.moveNote('n1', 'w1', 'w1', noteData);
      
      expect(set).toHaveBeenCalled();
      expect(remove).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // Lock Operations
  // ==========================================
  describe('Lock Operations', () => {
    it('acquireLock sets lock data and onDisconnect', async () => {
      const onDisconnectRemove = vi.fn();
      (onDisconnect as Mock).mockReturnValue({ remove: onDisconnectRemove });

      await DatabaseService.acquireLock('n1', mockUser);

      expect(set).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ userId: mockUser.uid })
      );
      expect(onDisconnect).toHaveBeenCalled();
      expect(onDisconnectRemove).toHaveBeenCalled();
    });

    it('releaseLock removes lock and cancels onDisconnect', async () => {
      const onDisconnectCancel = vi.fn();
      (onDisconnect as Mock).mockReturnValue({ cancel: onDisconnectCancel });

      await DatabaseService.releaseLock('n1');

      expect(remove).toHaveBeenCalled();
      expect(onDisconnectCancel).toHaveBeenCalled();
    });

    it('renewLock updates timestamp', async () => {
      await DatabaseService.renewLock('n1');
      expect(update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ timestamp: expect.any(Number) })
      );
    });
  });

  // ==========================================
  // Worker Operations
  // ==========================================
  describe('Worker Operations', () => {
    it('createWorker pushes new worker', async () => {
      await DatabaseService.createWorker('John', 'Blue');
      expect(push).toHaveBeenCalledWith(
        expect.anything(),
        { name: 'John', notes: {}, defaultColor: 'Blue' }
      );
    });

    it('updateWorker updates worker data', async () => {
      await DatabaseService.updateWorker('w1', { name: 'John 2' });
      expect(update).toHaveBeenCalledWith(expect.anything(), { name: 'John 2' });
    });

    it('deleteWorker removes worker', async () => {
      await DatabaseService.deleteWorker('w1');
      expect(remove).toHaveBeenCalled();
    });
  });

  // ==========================================
  // Category Operations
  // ==========================================
  describe('Category Operations', () => {
    it('createCategory pushes new category', async () => {
      await DatabaseService.createCategory('Urgent');
      expect(push).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ name: 'Urgent', color: 'Green' })
      );
    });

    it('updateCategory updates category data', async () => {
      await DatabaseService.updateCategory('c1', { color: 'Red' });
      expect(update).toHaveBeenCalledWith(expect.anything(), { color: 'Red' });
    });

    it('deleteCategory removes category', async () => {
      await DatabaseService.deleteCategory('c1');
      expect(remove).toHaveBeenCalled();
    });
  });

  // ==========================================
  // Presence Operations
  // ==========================================
  describe('Presence Operations', () => {
    it('initializePresence sets status and handles onDisconnect', () => {
      const onDisconnectRemove = vi.fn();
      (onDisconnect as Mock).mockReturnValue({ remove: onDisconnectRemove });

      DatabaseService.initializePresence(mockUser);

      expect(onDisconnectRemove).toHaveBeenCalled();
      expect(set).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: mockUser.uid,
          online: true,
          lastActive: 'MOCK_TIMESTAMP'
        })
      );
    });
  });

  // ==========================================
  // Snapshot & Restore Operations
  // ==========================================
  describe('Snapshot Operations', () => {
    it('saveSnapshot pushes new snapshot', async () => {
      // Mock get to return empty initially to skip pruning logic
      (get as Mock).mockResolvedValue({ exists: () => false });

      const boardData = {};
      const categories = {};
      
      await DatabaseService.saveSnapshot(mockUser, 'Auto Save', boardData, categories);

      expect(push).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          title: 'Auto Save',
          creatorId: mockUser.uid
        })
      );
    });

    it('saveSnapshot prunes old snapshots if > 100', async () => {
      // Create 105 dummy snapshots
      const snapshots: Record<string, any> = {};
      for (let i = 0; i < 105; i++) {
        snapshots[`snap_${i}`] = { timestamp: i };
      }

      (get as Mock).mockResolvedValue({ 
        exists: () => true,
        val: () => snapshots
      });

      await DatabaseService.saveSnapshot(mockUser, 'Save', {}, {});

      // Should prune 105 - 99 = 6 items (since we keep 99 + new one? logic says keep 99)
      // Logic: if entries.length >= 100. slice(0, length - 99).
      // 105 length. slice(0, 6). 
      // It should call update with nulls for those keys.
      
      expect(update).toHaveBeenCalledTimes(1); // One for prune
      const updateCall = (update as Mock).mock.calls[0];
      const updatesArg = updateCall[1];
      
      expect(Object.keys(updatesArg).length).toBe(6);
      expect(updatesArg['snap_0']).toBeNull(); // Oldest
    });

    it('deleteSnapshot removes snapshot', async () => {
      await DatabaseService.deleteSnapshot('snap1');
      expect(remove).toHaveBeenCalled();
    });

    it('restoreBackup overwrites boardData and categories', async () => {
      const boardData = { w1: { name: 'W1' } };
      const categories = { c1: { name: 'C1', items: [] } };

      await DatabaseService.restoreBackup(boardData, categories);

      expect(set).toHaveBeenCalledTimes(2);
      expect(set).toHaveBeenCalledWith(expect.anything(), boardData);
      expect(set).toHaveBeenCalledWith(expect.anything(), categories);
    });
  });
});