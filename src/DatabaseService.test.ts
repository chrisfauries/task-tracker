import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { DatabaseService } from "./DatabaseService";
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
  orderByChild,
  limitToLast,
} from "firebase/database";
import type { User } from "firebase/auth";

// ==========================================
// Mocks
// ==========================================

vi.mock("firebase/database", () => {
  // Mock push to act as both a synchronous reference generator (for createCategory)
  // and a thenable promise (for createWorker which awaits it).
  const pushMock = vi.fn().mockImplementation(() => {
    const mockKey = "mock-key-" + Math.random().toString(36).substr(2, 9);

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
      },
    };
    return mockRef;
  });

  return {
    getDatabase: vi.fn(() => ({ app: "MOCK_APP" })), // Return a mock DB object so 'db' is not undefined
    // Return a mock object so expects needing a 'ref' don't get undefined
    ref: vi.fn(() => ({ key: "mock-ref-path" })),
    set: vi.fn(),
    get: vi.fn(),
    remove: vi.fn(),
    update: vi.fn(),
    onValue: vi.fn(),
    push: pushMock,
    // Return mock objects for query functions so they can be chained/passed
    query: vi.fn(() => ({ queryKey: "mock-query" })),
    orderByChild: vi.fn(() => ({ orderKey: "mock-order" })),
    limitToLast: vi.fn(() => ({ limitKey: "mock-limit" })),
    serverTimestamp: vi.fn(() => "MOCK_TIMESTAMP"),
    onDisconnect: vi.fn(() => ({
      remove: vi.fn(),
      cancel: vi.fn(),
    })),
  };
});

describe("DatabaseService", () => {
  const mockUser = {
    uid: "user123",
    displayName: "Test User",
    photoURL: "http://example.com/photo.jpg",
  } as User;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("User Settings (Theme)", () => {
    it("saveTheme sets dark mode preference", async () => {
      await DatabaseService.saveTheme("user123", true);
      expect(ref).toHaveBeenCalledWith(
        expect.anything(),
        "users/user123/settings/darkMode"
      );
      expect(set).toHaveBeenCalledWith(expect.anything(), true);
    });

    it("saveTheme sets light mode preference", async () => {
      await DatabaseService.saveTheme("user123", false);
      expect(ref).toHaveBeenCalledWith(
        expect.anything(),
        "users/user123/settings/darkMode"
      );
      expect(set).toHaveBeenCalledWith(expect.anything(), false);
    });

    it("subscribeToTheme calls onValue with correct path", () => {
      const cb = vi.fn();
      DatabaseService.subscribeToTheme("user123", cb);
      expect(ref).toHaveBeenCalledWith(
        expect.anything(),
        "users/user123/settings/darkMode"
      );
      expect(onValue).toHaveBeenCalled();
    });
  });

  describe("Subscriptions", () => {
    it("subscribeToBoardData calls onValue", () => {
      const cb = vi.fn();
      DatabaseService.subscribeToBoardData(cb);
      expect(onValue).toHaveBeenCalled();
      expect(ref).toHaveBeenCalledWith(expect.anything(), "boarddata");
    });

    it("subscribeToCategories calls onValue", () => {
      const cb = vi.fn();
      DatabaseService.subscribeToCategories(cb);
      expect(onValue).toHaveBeenCalled();
      expect(ref).toHaveBeenCalledWith(expect.anything(), "categories");
    });

    it("subscribeToLocks calls onValue", () => {
      const cb = vi.fn();
      DatabaseService.subscribeToLocks(cb);
      expect(onValue).toHaveBeenCalled();
      expect(ref).toHaveBeenCalledWith(expect.anything(), "locks");
    });

    it("subscribeToPresence calls onValue", () => {
      const cb = vi.fn();
      DatabaseService.subscribeToPresence(cb);
      expect(onValue).toHaveBeenCalled();
      expect(ref).toHaveBeenCalledWith(expect.anything(), "presence");
    });

it("subscribeToSnapshots calls onValue with query params", () => {
      const cb = vi.fn();
      DatabaseService.subscribeToSnapshots(cb);
      expect(query).toHaveBeenCalled();
      expect(orderByChild).toHaveBeenCalledWith("timestamp");
      expect(onValue).toHaveBeenCalled();
    });
  });

  describe("Note Operations", () => {
    it("getNote fetches note data", async () => {
      (get as Mock).mockResolvedValue({
        exists: () => true,
        val: () => ({ text: "fetched note" }),
      });
      const note = await DatabaseService.getNote("w1", "n1");
      expect(get).toHaveBeenCalled();
      expect(note).toEqual({ text: "fetched note" });
    });

    it("getNote returns null if not exists", async () => {
      (get as Mock).mockResolvedValue({
        exists: () => false,
      });
      const note = await DatabaseService.getNote("w1", "n1");
      expect(note).toBeNull();
    });

    it("createNote pushes new note", async () => {
      const note = { text: "test", column: 0, position: 0 };
      await DatabaseService.createNote("w1", note);
      expect(push).toHaveBeenCalled();
      expect(set).toHaveBeenCalledWith(expect.anything(), note);
    });

    it("addNote sets note at specific ID", async () => {
      const note = { text: "specific", column: 0, position: 0 };
      await DatabaseService.addNote("w1", "n1", note);
      expect(set).toHaveBeenCalledWith(expect.anything(), note);
    });

    it("updateNoteText sets new text", async () => {
      await DatabaseService.updateNoteText("w1", "n1", "new text");
      expect(set).toHaveBeenCalledWith(expect.anything(), "new text");
    });

    it("updateNoteColor sets new color", async () => {
      await DatabaseService.updateNoteColor("w1", "n1", 1); // 1 = Blue
      expect(set).toHaveBeenCalledWith(expect.anything(), 1);
    });

    it("updateNoteCategory updates category and color", async () => {
      await DatabaseService.updateNoteCategory("w1", "n1", "Work", 3); // 3 = Red
      expect(update).toHaveBeenCalledWith(expect.anything(), {
        categoryName: "Work",
        color: 3,
      });
    });

    it("deleteNote removes note", async () => {
      await DatabaseService.deleteNote("w1", "n1");
      expect(remove).toHaveBeenCalled();
    });

    it("moveNote sets data in new loc and removes from old loc", async () => {
      const note = { text: "moving", column: 0, position: 0 };
      await DatabaseService.moveNote("n1", "w1", "w2", note);
      // Should set in w2
      expect(set).toHaveBeenCalled();
      // Should remove from w1
      expect(remove).toHaveBeenCalled();
    });

    it("moveNote does not remove if worker is same", async () => {
      const note = { text: "staying", column: 0, position: 0 };
      await DatabaseService.moveNote("n1", "w1", "w1", note);
      expect(set).toHaveBeenCalled();
      expect(remove).not.toHaveBeenCalled();
    });
  });

  describe("Worker Operations", () => {
    it("createWorker pushes new worker", async () => {
      await DatabaseService.createWorker("Dave", 3); // 3 = Red
      expect(set).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ name: "Dave", defaultColor: 3 })
      );
    });

    it("updateWorker updates worker fields", async () => {
      await DatabaseService.updateWorker("w1", { name: "New Name" });
      expect(update).toHaveBeenCalledWith(expect.anything(), {
        name: "New Name",
      });
    });

    it("deleteWorker removes worker", async () => {
      await DatabaseService.deleteWorker("w1");
      expect(remove).toHaveBeenCalled();
    });

    it("updateWorkerPositions updates multiple worker positions", async () => {
      await DatabaseService.updateWorkerPositions({
        w1: 0,
        w2: 1000,
      });
      expect(update).toHaveBeenCalledWith(expect.anything(), {
        "boarddata/w1/position": 0,
        "boarddata/w2/position": 1000,
      });
    });
  });

  describe("Worker Order Operations", () => {
    it("saveWorkerOrderMode sets mode", async () => {
      await DatabaseService.saveWorkerOrderMode("user123", "personal");
      expect(ref).toHaveBeenCalledWith(
        expect.anything(),
        "users/user123/settings/workerOrderMode"
      );
      expect(set).toHaveBeenCalledWith(expect.anything(), "personal");
    });

    it("subscribeToWorkerOrderMode calls onValue", () => {
      const cb = vi.fn();
      DatabaseService.subscribeToWorkerOrderMode("user123", cb);
      expect(ref).toHaveBeenCalledWith(
        expect.anything(),
        "users/user123/settings/workerOrderMode"
      );
      expect(onValue).toHaveBeenCalled();
    });

    it("updatePersonalWorkerPositions calls update", async () => {
      const updates = { w1: 100, w2: 200 };
      await DatabaseService.updatePersonalWorkerPositions("user123", updates);
      expect(ref).toHaveBeenCalledWith(
        expect.anything(),
        "users/user123/workerPositions"
      );
      expect(update).toHaveBeenCalledWith(expect.anything(), updates);
    });

    it("subscribeToPersonalWorkerPositions calls onValue", () => {
      const cb = vi.fn();
      DatabaseService.subscribeToPersonalWorkerPositions("user123", cb);
      expect(ref).toHaveBeenCalledWith(
        expect.anything(),
        "users/user123/workerPositions"
      );
      expect(onValue).toHaveBeenCalled();
    });
  });

  describe("Category Operations", () => {
    it("createCategory creates category and returns key", async () => {
      const name = "New Category";
      // Execute
      const result = await DatabaseService.createCategory(name);

      // Verification
      // 1. push called to generate key (arg 1 is the ref)
      expect(push).toHaveBeenCalled();

      // 2. set called with the ref from push, and the data
      // Default color is 0 (Green), default order is 0
      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({ key: result }),
        { name, items: [], color: 0, order: 0 }
      );

      // 3. result matches the key format
      expect(result).toMatch(/^mock-key-/);
    });

    it("createCategory creates category with color and returns key ", async () => {
      const name = "New Category";
      // Execute
      const result = await DatabaseService.createCategory(name, 3); // 3 = Red

      // Verification
      // 1. push called to generate key (arg 1 is the ref)
      expect(push).toHaveBeenCalled();

      // 2. set called with the ref from push, and the data
      // Default order is 0
      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({ key: result }),
        { name, items: [], color: 3, order: 0 }
      );

      // 3. result matches the key format
      expect(result).toMatch(/^mock-key-/);
    });

    it("updateCategory updates fields", async () => {
      await DatabaseService.updateCategory("cat1", { color: 3 });
      expect(update).toHaveBeenCalledWith(expect.anything(), { color: 3 });
    });

    it("deleteCategory removes category", async () => {
      await DatabaseService.deleteCategory("cat1");
      expect(remove).toHaveBeenCalled();
    });
  });

  describe("Lock Operations", () => {
    it("acquireLock sets lock with timestamp", async () => {
      await DatabaseService.acquireLock("n1", mockUser);
      expect(set).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ userId: mockUser.uid })
      );
      expect(onDisconnect).toHaveBeenCalled();
    });

    it("releaseLock removes lock", async () => {
      await DatabaseService.releaseLock("n1");
      expect(remove).toHaveBeenCalled();
    });

    it("renewLock updates timestamp", async () => {
      await DatabaseService.renewLock("n1");
      expect(update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ timestamp: expect.any(Number) })
      );
    });
  });

  describe("Presence Operations", () => {
    it("initializePresence sets user status and onDisconnect", () => {
      DatabaseService.initializePresence(mockUser);
      expect(set).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: mockUser.uid,
          online: true,
          lastActive: "MOCK_TIMESTAMP",
        })
      );
      expect(onDisconnect).toHaveBeenCalled();
    });
  });

  describe("Snapshot Operations", () => {
    describe("Snapshot Operations", () => {
    it("saveSnapshot pushes new snapshot and prunes old ones", async () => {
      // Mock get to return many snapshots
      const snapshots: Record<string, any> = {};
      for (let i = 0; i < 105; i++) {
        snapshots[`snap_${i}`] = { timestamp: i };
      }

      (get as Mock).mockResolvedValue({
        exists: () => true,
        val: () => snapshots,
      });

      await DatabaseService.saveSnapshot(mockUser, "Save", {}, {});

      // Ensure get was used for pruning check (no longer using query)
      expect(get).toHaveBeenCalled();

      expect(update).toHaveBeenCalledTimes(1); // One for prune
      const updateCall = (update as Mock).mock.calls[0];
      const updatesArg = updateCall[1];

      // Should prune 105 - 49 = 56 items
      expect(Object.keys(updatesArg).length).toBe(56);
      expect(push).toHaveBeenCalled();
    });

    it("pruneSnapshots removes old snapshots", async () => {
      const snapshots: Record<string, any> = {};
      for (let i = 0; i < 10; i++) {
        snapshots[`snap_${i}`] = { timestamp: i };
      }

      (get as Mock).mockResolvedValue({
        exists: () => true,
        val: () => snapshots,
      });

      // Keep 5. Should remove 0, 1, 2, 3, 4 (5 items)
      await DatabaseService.pruneSnapshots(5);

      expect(get).toHaveBeenCalled();
      expect(update).toHaveBeenCalledWith(
        expect.anything(),
        {
          "snap_0": null,
          "snap_1": null,
          "snap_2": null,
          "snap_3": null,
          "snap_4": null
        }
      );
    });
  });


    it("deleteSnapshot removes snapshot", async () => {
      await DatabaseService.deleteSnapshot("snap1");
      expect(remove).toHaveBeenCalled();
    });

    it("restoreBackup overwrites boardData and categories and customPalette", async () => {
      await DatabaseService.restoreBackup({}, {}, []);
      expect(set).toHaveBeenCalledTimes(3);
    });
  });
});