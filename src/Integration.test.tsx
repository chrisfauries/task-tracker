import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import EventBoundary from "./EventBoundary";
import { ContextMenu } from "./ContextMenu";
import { StickyNote } from "./StickyNote";
import { SearchAndFilter } from "./SearchAndFilter";
import { 
  contextMenuPosAtom, 
  isAddToCategoryDialogOpenAtom, 
  categoriesAtom, 
  searchQueryAtom, 
  selectedCategoriesAtom 
} from "./atoms";
import type { CategoriesData } from "./types";

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
  },
}));

describe("Integration: EventBoundary & ContextMenu", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    store.set(contextMenuPosAtom, { x: 50, y: 50 });
    store.set(isAddToCategoryDialogOpenAtom, false);
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
      </Provider>
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
    // 1. Sets isAddToCategoryDialogOpenAtom = true
    // 2. Sets contextMenuPosAtom = null (closes menu manually)
    
    expect(store.get(isAddToCategoryDialogOpenAtom)).toBe(true);
    expect(store.get(contextMenuPosAtom)).toBeNull();
  });
});

describe("Integration: Search, Filter & StickyNote", () => {
  let store: ReturnType<typeof createStore>;

  const mockCategories: CategoriesData = {
    cat1: { name: "Project A", items: [] },
    cat2: { name: "Project B", items: [] },
  };

  beforeEach(() => {
    store = createStore();
    store.set(categoriesAtom, mockCategories);
    store.set(searchQueryAtom, "");
    store.set(selectedCategoriesAtom, []);
  });

  // Helper to render the relevant parts of the app
  const renderIntegration = () => {
    // We need props for StickyNote, but most can be dummy no-ops for this visual test
    const dummyProps = {
      id: "note-1",
      workerId: "worker-1",
      column: 0,
      position: 100,
      prevPos: 0,
      nextPos: 200,
      onReorder: vi.fn(),
      onDragStart: vi.fn(),
      onDragEnd: vi.fn(),
      locks: {},
      currentUser: { uid: "user-1" } as any,
      onActivity: vi.fn(),
      onHistory: vi.fn(),
    };

    return render(
      <Provider store={store}>
        <div className="flex flex-col">
          <SearchAndFilter />
          <div data-testid="board">
            <StickyNote 
              {...dummyProps} 
              text="Fix critical bug in login" 
              categoryName="Project A" 
            />
            <StickyNote 
              {...dummyProps} 
              id="note-2"
              text="Update documentation" 
              categoryName="Project B" 
            />
          </div>
        </div>
      </Provider>
    );
  };

  it("filters notes based on search query (fuzzy match)", () => {
    renderIntegration();

    const note1 = screen.getByText("Fix critical bug in login").closest(".group\\/note");
    const note2 = screen.getByText("Update documentation").closest(".group\\/note");

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

    const note1 = screen.getByText("Fix critical bug in login").closest(".group\\/note");
    const note2 = screen.getByText("Update documentation").closest(".group\\/note");

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

    const note1 = screen.getByText("Fix critical bug in login").closest(".group\\/note");
    const note2 = screen.getByText("Update documentation").closest(".group\\/note");

    // 1. Select "Project A" -> Note 2 hidden
    fireEvent.click(screen.getByTitle("Filter by category"));
    fireEvent.click(screen.getByLabelText("Project A"));
    expect(note2).toHaveClass("opacity-30");

    // 2. Search for "bug" -> Note 1 matches search AND category
    const searchInput = screen.getByPlaceholderText("Search...");
    fireEvent.change(searchInput, { target: { value: "bug" } });
    
    expect(note1).toHaveClass("opacity-100"); // Matches both
    expect(note2).toHaveClass("opacity-30");  // Matches neither search nor cat

    // 3. Search for "missing" -> Matches nothing
    fireEvent.change(searchInput, { target: { value: "missing" } });
    expect(note1).toHaveClass("opacity-30");
    expect(note2).toHaveClass("opacity-30");
  });

  it("clearing filters restores visibility", () => {
    renderIntegration();
    const note1 = screen.getByText("Fix critical bug in login").closest(".group\\/note");

    // Apply strict filters that hide everything
    const searchInput = screen.getByPlaceholderText("Search...");
    fireEvent.change(searchInput, { target: { value: "xyz" } });
    expect(note1).toHaveClass("opacity-30");

    // Clear search
    fireEvent.click(screen.getAllByRole("button")[0]); // Clear button
    expect(note1).toHaveClass("opacity-100");
  });
});