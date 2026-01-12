import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import EventBoundary from "./EventBoundary";
import { Provider, createStore } from "jotai";
import { contextMenuPosAtom } from "./atoms";

describe("EventBoundary", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    // Start with the menu open to test closing behavior
    store.set(contextMenuPosAtom, { x: 100, y: 100 });
  });

  const renderBoundary = () => {
    return render(
      <Provider store={store}>
        <EventBoundary>
          <div data-testid="child-content">Child Content</div>
        </EventBoundary>
      </Provider>
    );
  };

  it("renders children correctly", () => {
    const { getByTestId } = renderBoundary();
    expect(getByTestId("child-content")).toBeInTheDocument();
  });

  it("closes context menu on document click if event is NOT flagged", () => {
    renderBoundary();

    // Verify it is open initially
    expect(store.get(contextMenuPosAtom)).not.toBeNull();

    // Create a generic click event
    const event = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    });

    // Fire on document (simulating a click anywhere on the page)
    fireEvent(document, event);

    // Should close the menu (atom becomes null)
    expect(store.get(contextMenuPosAtom)).toBeNull();
  });

  it("does NOT close context menu if event is flagged as isWithinContextMenu", () => {
    renderBoundary();

    expect(store.get(contextMenuPosAtom)).not.toBeNull();

    const event = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    });

    // Manually flag the event, mimicking the behavior of ContextMenu
    (event as any).isWithinContextMenu = true;

    fireEvent(document, event);

    // Should remain open
    expect(store.get(contextMenuPosAtom)).toEqual({ x: 100, y: 100 });
  });
});