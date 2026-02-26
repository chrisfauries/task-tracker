import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { WorkerNameTag } from "./WorkerNameTag";
import {
  isDialogOpen,
  Dialog,
  openDialog,
  editingWorkerAtom,
  workerToDeleteAtom,
  boardDataAtom,
} from "./atoms";

describe("WorkerNameTag", () => {
  let store: ReturnType<typeof createStore>;

  const defaultProps = {
    workerId: "worker-1",
  };

  beforeEach(() => {
    store = createStore();
    // Initialize default states for the atoms
    store.set(openDialog, Dialog.NONE);
    store.set(editingWorkerAtom, null);
    store.set(workerToDeleteAtom, null);
    store.set(boardDataAtom, {
      "worker-1": { name: "John Doe", defaultColor: 0, notes: {} },
    });
  });

  const renderComponent = (props = defaultProps) => {
    return render(
      <Provider store={store}>
        <WorkerNameTag {...props} />
      </Provider>
    );
  };

  it("renders the worker name correctly", () => {
    renderComponent();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  describe("Edit Logic (Double Click)", () => {
    it("opens the edit dialog and sets editing atom with the provided defaultColor", () => {
      store.set(boardDataAtom, {
        "worker-1": { name: "John Doe", defaultColor: 3, notes: {} },
      });
      renderComponent();

      // Find the main container using the title attribute
      const container = screen.getByTitle("Double click to edit name");
      fireEvent.doubleClick(container);

      // Assert that the dialog open state was set to true
      expect(store.get(isDialogOpen(Dialog.EDIT_WORKER))).toBe(true);

      // Assert that the payload was set correctly with the provided color
      expect(store.get(editingWorkerAtom)).toEqual({
        id: "worker-1",
        name: "John Doe",
        color: 3,
      });
    });

    it("defaults color to 0 if defaultColor is not provided", () => {
      store.set(boardDataAtom, {
        "worker-1": { name: "John Doe", notes: {} },
      });
      renderComponent();

      const container = screen.getByTitle("Double click to edit name");
      fireEvent.doubleClick(container);

      // Assert that the payload fell back to 0
      expect(store.get(editingWorkerAtom)).toEqual({
        id: "worker-1",
        name: "John Doe",
        color: 0,
      });
    });
  });

  describe("Delete Logic", () => {
    it("opens the delete dialog and sets the workerToDelete atom", () => {
      renderComponent();

      // Find the delete button ('✕')
      const deleteButton = screen.getByText("✕");
      fireEvent.click(deleteButton);

      // Assert dialog open state
      expect(store.get(isDialogOpen(Dialog.DELETE_WORKER))).toBe(true);

      // Assert payload
      expect(store.get(workerToDeleteAtom)).toEqual({
        id: "worker-1",
        name: "John Doe",
      });
    });

    it("stops event propagation when the delete button is clicked", () => {
      const parentClickMock = vi.fn();

      render(
        <Provider store={store}>
          {/* Wrap the component in a div with an onClick handler to detect bubbling */}
          <div onClick={parentClickMock}>
            <WorkerNameTag {...defaultProps} />
          </div>
        </Provider>
      );

      const deleteButton = screen.getByText("✕");
      fireEvent.click(deleteButton);

      // The click should be stopped at the button and not reach the wrapper
      expect(parentClickMock).not.toHaveBeenCalled();
      
      // Ensure the delete logic still ran
      expect(store.get(isDialogOpen(Dialog.DELETE_WORKER))).toBe(true);
    });
  });
});