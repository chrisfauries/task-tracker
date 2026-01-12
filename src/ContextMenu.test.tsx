import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContextMenu } from "./ContextMenu";
import { Provider, createStore } from "jotai";
import { contextMenuPosAtom, isAddToCategoryDialogOpenAtom } from "./atoms";

describe("ContextMenu", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    // Default state: menu is closed (position null)
    store.set(contextMenuPosAtom, null);
    store.set(isAddToCategoryDialogOpenAtom, false);
  });

  const renderContextMenu = () => {
    return render(
      <Provider store={store}>
        <ContextMenu />
      </Provider>
    );
  };

  it("renders nothing when position is null (closed)", () => {
    renderContextMenu();
    expect(screen.queryByText("Add to category...")).not.toBeInTheDocument();
  });

  it("renders at the correct coordinates when open", () => {
    const testPosition = { x: 150, y: 300 };
    store.set(contextMenuPosAtom, testPosition);

    renderContextMenu();

    const button = screen.getByText("Add to category...");
    const container = button.closest("div");

    expect(button).toBeInTheDocument();
    // Verify inline styles for positioning
    expect(container).toHaveStyle({
      top: `${testPosition.y}px`,
      left: `${testPosition.x}px`,
    });
  });

  it("opens 'Add to Category' dialog and closes itself on button click", () => {
    store.set(contextMenuPosAtom, { x: 100, y: 100 });
    renderContextMenu();

    const button = screen.getByText("Add to category...");
    fireEvent.click(button);

    // 1. Should set dialog atom to true
    expect(store.get(isAddToCategoryDialogOpenAtom)).toBe(true);
    // 2. Should set position atom to null (close menu)
    expect(store.get(contextMenuPosAtom)).toBeNull();
  });

  it("stops click propagation when button is clicked", () => {
    store.set(contextMenuPosAtom, { x: 100, y: 100 });
    const handleOuterClick = vi.fn();

    render(
      <Provider store={store}>
        {/* Wrapper to detect bubbling */}
        <div onClick={handleOuterClick}>
          <ContextMenu />
        </div>
      </Provider>
    );

    const button = screen.getByText("Add to category...");
    fireEvent.click(button);

    // The click should be stopped at the button and not reach the wrapper
    expect(handleOuterClick).not.toHaveBeenCalled();
  });

  it("sets custom flag on native event when container is clicked", () => {
    store.set(contextMenuPosAtom, { x: 100, y: 100 });
    renderContextMenu();

    const button = screen.getByText("Add to category...");
    const container = button.closest("div")!;

    // Create the event instance manually so we can hold a reference to it
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    });

    // Dispatch the specific event instance
    fireEvent(container, event);

    // React's e.nativeEvent points to our 'event' object
    // So we check if the property was added to it
    expect((event as any).isWithinContextMenu).toBe(true);
  });

  it("sets custom flag on native event when button is clicked", () => {
    store.set(contextMenuPosAtom, { x: 100, y: 100 });
    renderContextMenu();

    const button = screen.getByText("Add to category...");

    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    });

    fireEvent(button, event);

    expect((event as any).isWithinContextMenu).toBe(true);
  });
});