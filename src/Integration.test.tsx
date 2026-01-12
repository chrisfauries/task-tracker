import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import EventBoundary from "./EventBoundary";
import { ContextMenu } from "./ContextMenu";
import { contextMenuPosAtom, isAddToCategoryDialogOpenAtom } from "./atoms";

// Mock DatabaseService to avoid side effects or connection errors in integration tests
vi.mock("./DatabaseService", () => ({
  DatabaseService: {
    subscribeToSnapshots: vi.fn(() => () => {}),
    subscribeToCategories: vi.fn(() => () => {}),
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