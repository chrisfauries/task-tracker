import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import EventBoundary from "./EventBoundary";
import { ContextMenu } from "./ContextMenu";
import { StickyNote } from "./StickyNote";
import { SearchAndFilter } from "./SearchAndFilter";
import {
  contextMenuPosAtom,
  categoriesAtom,
  searchQueryAtom,
  selectedCategoriesAtom,
  boardDataAtom,
  isDialogOpen,
  Dialog,
  userAtom,
} from "./atoms";
import type { CategoriesData, BoardData } from "./types";
import { UndoRedoControls } from "./UndoRedoControls";
import { DropZone } from "./DropZone";
import { DatabaseService } from "./DatabaseService";

// Mock DatabaseService to avoid side effects or connection errors in integration tests
vi.mock("./DatabaseService", () => ({
  DatabaseService: {
    subscribeToSnapshots: vi.fn(() => () => {}),
    subscribeToCategories: vi.fn(() => () => {}),
    acquireLock: vi.fn().mockResolvedValue(true),
    releaseLock: vi.fn().mockResolvedValue(true),
    renewLock: vi.fn().mockResolvedValue(true),
    updateNoteText: vi.fn().mockResolvedValue(true),
    subscribeToCustomPalette: vi.fn(() => () => {}),
    subscribeToLocks: vi.fn(() => () => {}),
    subscribeToBoardData: vi.fn(() => () => {}),
    subscribeToPresence: vi.fn(() => () => {}),
    moveNote: vi.fn().mockResolvedValue(true),
    deleteNote: vi.fn().mockResolvedValue(true),
    addNote: vi.fn().mockResolvedValue(true),
    getNote: vi.fn(),
  },
}));

vi.mock("firebase/database", () => ({
  getDatabase: vi.fn(),
  ref: vi.fn(),
  set: vi.fn().mockResolvedValue(undefined),
  push: vi.fn().mockReturnValue({ key: "new-key" }),
  remove: vi.fn().mockResolvedValue(undefined),
  onValue: vi.fn((ref, callback) => {
    callback({ val: () => ({}), exists: () => true });
    return vi.fn();
  }),
  get: vi.fn().mockResolvedValue({
    exists: () => true,
    val: () => ({ text: "Original Text", column: 0, position: 100, color: 0 }),
  }),
}));

vi.mock("./atoms", async (importOriginal) => {
  const { atom } = await import("jotai");
  const actual = await importOriginal<typeof import("./atoms")>();

  return {
    ...actual,
       userAtom: atom({
      uid: "test-user",
      displayName: "Test User",
      email: "test@example.com",
      photoURL: null,
    }),
  }
});

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(),
  onAuthStateChanged: vi.fn(() => () => {}),
  GoogleAuthProvider: vi.fn(),
}));

describe("Integration: EventBoundary & ContextMenu", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    store.set(contextMenuPosAtom, { x: 50, y: 50 });
  });

  const renderApp = () => {
    return render(
      <Provider store={store}>
        <EventBoundary>
          <div data-testid="app-content">
            <h1>My App</h1>
            {/* ContextMenu is rendered inside the boundary in the real app */}
            <ContextMenu />
          </div>
        </EventBoundary>
      </Provider>,
    );
  };

  it("closes menu when clicking outside (on generic app content)", () => {
    renderApp();

    // Ensure menu is visible
    expect(screen.getByText("Add to category...")).toBeInTheDocument();

    // Click on "App Content" (outside the menu)
    const appContent = screen.getByTestId("app-content");

    // Use a real MouseEvent to ensure bubbling works correctly
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    fireEvent(appContent, event);

    // The document listener in EventBoundary should catch this and close the menu
    expect(store.get(contextMenuPosAtom)).toBeNull();
    expect(screen.queryByText("Add to category...")).not.toBeInTheDocument();
  });

  it("keeps menu open when clicking inside the context menu container", () => {
    renderApp();

    const menuButton = screen.getByText("Add to category...");
    const menuContainer = menuButton.closest("div")!;

    // Click strictly on the container (e.g. padding/white space), not the button
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    fireEvent(menuContainer, event);

    // 1. ContextMenu onClick handler sets e.nativeEvent.isWithinContextMenu = true
    // 2. Event bubbles to document
    // 3. EventBoundary checks flag and should RETURN without closing
    expect(store.get(contextMenuPosAtom)).not.toBeNull();
    expect(screen.getByText("Add to category...")).toBeInTheDocument();
  });

  it("performs action and closes menu when clicking the menu button", () => {
    renderApp();

    const menuButton = screen.getByText("Add to category...");

    // Click the actual button
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    fireEvent(menuButton, event);

    // The button handler specifically:
    // 1. Sets openDialog(Dialog.ADD_TO_CATEGORY)
    // 2. Sets contextMenuPosAtom = null (closes menu manually)

    expect(store.get(isDialogOpen(Dialog.ADD_TO_CATEGORY))).toBe(true);
    expect(store.get(contextMenuPosAtom)).toBeNull();
  });
});

describe("Integration: Search, Filter & StickyNote", () => {
  let store: ReturnType<typeof createStore>;

  const mockCategories: CategoriesData = {
    cat1: { name: "Project A", items: [] },
    cat2: { name: "Project B", items: [] },
  };

  const mockBoardData: BoardData = {
    "worker-1": {
      name: "Worker 1",
      defaultColor: 0,
      notes: {
        "note-1": {
          text: "Fix critical bug in login",
          categoryName: "Project A",
          column: 0,
          position: 100,
          color: 0,
        },
        "note-2": {
          text: "Update documentation",
          categoryName: "Project B",
          column: 0,
          position: 200,
          color: 0,
        },
      },
    },
  };

  beforeEach(() => {
    store = createStore();
    store.set(categoriesAtom, mockCategories);
    store.set(boardDataAtom, mockBoardData);
    store.set(searchQueryAtom, "");
    store.set(selectedCategoriesAtom, []);
  });

  // Helper to render the relevant parts of the app
  const renderIntegration = () => {
    // We need props for StickyNote, but most can be dummy no-ops for this visual test
    const dummyProps = {
      workerId: "worker-1",
      prevPos: 0,
      nextPos: 200,
      onReorder: vi.fn(),
      onDragStart: vi.fn(),
      onDragEnd: vi.fn(),
      currentUser: { uid: "user-1" } as any,
      onHistory: vi.fn(),
    };

    return render(
      <Provider store={store}>
        <div className="flex flex-col">
          <SearchAndFilter />
          <div data-testid="board">
            <StickyNote {...dummyProps} id="note-1" />
            <StickyNote {...dummyProps} id="note-2" />
          </div>
        </div>
      </Provider>,
    );
  };

  it("filters notes based on search query (fuzzy match)", () => {
    renderIntegration();

    const note1 = screen
      .getByText("Fix critical bug in login")
      .closest(".group\\/note");
    const note2 = screen
      .getByText("Update documentation")
      .closest(".group\\/note");

    // Initially both visible (opacity-100)
    expect(note1).toHaveClass("opacity-100");
    expect(note2).toHaveClass("opacity-100");

    // Search for "login"
    const searchInput = screen.getByPlaceholderText("Search...");
    fireEvent.change(searchInput, { target: { value: "login" } });

    // Note 1 matches, Note 2 does not
    expect(note1).toHaveClass("opacity-100");
    expect(note2).toHaveClass("opacity-30"); // Filtered style
    expect(note2).toHaveClass("grayscale-[0.5]");
  });

  it("filters notes based on category selection", () => {
    renderIntegration();

    const note1 = screen
      .getByText("Fix critical bug in login")
      .closest(".group\\/note");
    const note2 = screen
      .getByText("Update documentation")
      .closest(".group\\/note");

    // Open filter menu
    fireEvent.click(screen.getByTitle("Filter by category"));

    // Select "Project A"
    const projACheckbox = screen.getByLabelText("Project A");
    fireEvent.click(projACheckbox);

    // Note 1 (Project A) should be visible, Note 2 (Project B) hidden
    expect(note1).toHaveClass("opacity-100");
    expect(note2).toHaveClass("opacity-30");

    // Select "Project B" as well (OR logic)
    const projBCheckbox = screen.getByLabelText("Project B");
    fireEvent.click(projBCheckbox);

    // Both should be visible now
    expect(note1).toHaveClass("opacity-100");
    expect(note2).toHaveClass("opacity-100");
  });

  it("filters based on combined search AND category", () => {
    renderIntegration();

    const note1 = screen
      .getByText("Fix critical bug in login")
      .closest(".group\\/note");
    const note2 = screen
      .getByText("Update documentation")
      .closest(".group\\/note");

    // 1. Select "Project A" -> Note 2 hidden
    fireEvent.click(screen.getByTitle("Filter by category"));
    fireEvent.click(screen.getByLabelText("Project A"));
    expect(note2).toHaveClass("opacity-30");

    // 2. Search for "bug" -> Note 1 matches search AND category
    const searchInput = screen.getByPlaceholderText("Search...");
    fireEvent.change(searchInput, { target: { value: "bug" } });

    expect(note1).toHaveClass("opacity-100"); // Matches both
    expect(note2).toHaveClass("opacity-30"); // Matches neither search nor cat

    // 3. Search for "missing" -> Matches nothing
    fireEvent.change(searchInput, { target: { value: "missing" } });
    expect(note1).toHaveClass("opacity-30");
    expect(note2).toHaveClass("opacity-30");
  });

  it("clearing filters restores visibility", () => {
    renderIntegration();
    const note1 = screen
      .getByText("Fix critical bug in login")
      .closest(".group\\/note");

    // Apply strict filters that hide everything
    const searchInput = screen.getByPlaceholderText("Search...");
    fireEvent.change(searchInput, { target: { value: "xyz" } });
    expect(note1).toHaveClass("opacity-30");

    // Clear search
    fireEvent.click(screen.getAllByRole("button")[0]); // Clear button
    expect(note1).toHaveClass("opacity-100");
  });
});

  describe("Integration: Undo/Redo with StickyNotes", () => {
    let store: ReturnType<typeof createStore>;

    const mockUser = { uid: "user-1", displayName: "Test User" };

    const initialBoardData: BoardData = {
      "worker-1": {
        name: "Worker 1",
        defaultColor: 0,
        notes: {
          "note-1": {
            text: "Original Text",
            column: 0,
            position: 100,
            color: 0,
          },
        },
      },
      "worker-2": {
        name: "Worker 2",
        defaultColor: 1,
        notes: {},
      },
    };

    beforeEach(() => {
      vi.clearAllMocks();
      store = createStore();
      store.set(userAtom, mockUser as any);
      store.set(boardDataAtom, initialBoardData);
    });

    const renderApp = () => {
      return render(
        <Provider store={store}>
          <div className="flex flex-col gap-4">
            <UndoRedoControls />
            <div className="flex gap-4">
              <DropZone workerId="worker-1" colIndex={0} />
              <DropZone workerId="worker-2" colIndex={0} />
            </div>
          </div>
        </Provider>,
      );
    };

    it("registers a move action and undoes it", async () => {
      const { container } = renderApp();

      const undoBtn = screen.getByTitle("Undo");
      const redoBtn = screen.getByTitle("Redo");

      // 1. Initial State: History is empty
      expect(undoBtn).toBeDisabled();

      // 2. Simulate a Move (Worker 1 -> Worker 2)
      // We mock getNote because moveNote logic in history needs current data to revert
      vi.mocked(DatabaseService.getNote).mockResolvedValue(
        initialBoardData["worker-1"].notes!["note-1"],
      );

      const note = screen.getByText("Original Text");
      const targetZone = container.querySelectorAll(".bg-slate-200\\/40")[1]; // Second DropZone

      // Simulate drag and drop
      const dragData = JSON.stringify({
        noteId: "note-1",
        oldWorkerId: "worker-1",
        oldColumn: 0,
        oldPosition: 100,
      });

      fireEvent.dragStart(note, {
        dataTransfer: { setData: vi.fn(), getData: () => dragData },
      });
      fireEvent.drop(targetZone, { dataTransfer: { getData: () => dragData } });

      // 3. Verify undo is now enabled
      await waitFor(() => expect(undoBtn).not.toBeDisabled());

      // 4. Perform Undo
      fireEvent.click(undoBtn);

      // 5. Check if DatabaseService.moveNote was called with original coordinates
      await waitFor(() => {
        expect(DatabaseService.moveNote).toHaveBeenCalledWith(
          "note-1",
          "worker-2", // From current
          "worker-1", // Back to prev
          expect.objectContaining({
            column: 0,
            position: 100,
          }),
        );
      });
    });

    it("registers a deletion and re-adds the note via undo", async () => {
      renderApp();

      const undoBtn = screen.getByTitle("Undo");

      // 1. Trigger deletion
      // Drop the note into the trash area of its own zone
      const note = screen.getByText("Original Text");
      
      const dragData = JSON.stringify({
        noteId: "note-1",
        oldWorkerId: "worker-1",
      });

      // We mock get() inside DropZone/DatabaseService
      // In history, DELETE undo calls addNote(workerId, noteId, noteData)

      fireEvent.dragStart(note, {
        dataTransfer: { setData: vi.fn(), getData: () => dragData },
      });

      // Wait for the trash zone to appear (it's conditional on drag start)
      const trashText = await screen.findByText("Drop to Delete");
      const trashZone = trashText.closest("div")!;

      fireEvent.drop(trashZone, { dataTransfer: { getData: () => dragData } });

      await waitFor(() => expect(undoBtn).not.toBeDisabled());

      // 2. Perform Undo
      fireEvent.click(undoBtn);

      // 3. Verify addNote was called with the saved note data
      await waitFor(() => {
        expect(DatabaseService.addNote).toHaveBeenCalledWith(
          "worker-1",
          "note-1",
          initialBoardData["worker-1"].notes!["note-1"],
        );
      });
    });

    it("handles the full Undo -> Redo flow for text editing", async () => {
      renderApp();
      const undoBtn = screen.getByTitle("Undo");
      const redoBtn = screen.getByTitle("Redo");

      const noteTextElement = screen.getByText("Original Text");

      // 1. Simulate editing text
      // Double click to enter edit mode, change text, then blur
      fireEvent.doubleClick(noteTextElement);
      
      await waitFor(() => {
        expect(noteTextElement).toHaveAttribute("contenteditable", "true");
      });

      noteTextElement.innerText = "Updated Text";
      fireEvent.blur(noteTextElement);

      await waitFor(() => expect(undoBtn).not.toBeDisabled());

      // 2. Undo the edit
      fireEvent.click(undoBtn);
      await waitFor(() => {
        expect(DatabaseService.updateNoteText).toHaveBeenCalledWith(
          "worker-1",
          "note-1",
          "Original Text",
        );
      });

      // 3. Redo the edit
      expect(redoBtn).not.toBeDisabled();
      fireEvent.click(redoBtn);
      await waitFor(() => {
        expect(DatabaseService.updateNoteText).toHaveBeenLastCalledWith(
          "worker-1",
          "note-1",
          "Updated Text",
        );
      });
    });
  });
