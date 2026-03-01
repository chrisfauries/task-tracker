import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { UndoRedoControls } from "./UndoRedoControls";
import * as atoms from "./atoms";

// Variables prefixed with 'mock' are accessible inside vi.mock
const mockUndoAction = vi.fn();
const mockRedoAction = vi.fn();

// Mock the atoms module to make derived atoms writable for the test
vi.mock("./atoms", async (importOriginal) => {
  const { atom } = await import("jotai");
  const actual = await importOriginal<typeof import("./atoms")>();
  return {
    ...actual,
    // Redefine as primitive atoms so we can use store.set()
    canUndoAtom: atom(false),
    canRedoAtom: atom(false),
    // Redefine as write-only atoms that call our mocks
    undoAtom: atom(null, () => mockUndoAction()),
    redoAtom: atom(null, () => mockRedoAction()),
  };
});

// Mocking Firebase as seen in other test patterns
vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(),
  onAuthStateChanged: vi.fn(() => () => {}),
  GoogleAuthProvider: vi.fn(),
}));

describe("UndoRedoControls Component", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    store = createStore();
    
    // Initialize the mocked atoms
    store.set(atoms.canUndoAtom, false);
    store.set(atoms.canRedoAtom, false);
  });

  const renderComponent = () => {
    return render(
      <Provider store={store}>
        <UndoRedoControls />
      </Provider>
    );
  };

  describe("Initial State & Rendering", () => {
    it("renders both undo and redo buttons with correct titles", () => {
      renderComponent();
      expect(screen.getByTitle("Undo")).toBeInTheDocument();
      expect(screen.getByTitle("Redo")).toBeInTheDocument();
    });

    it("disables both buttons when history is empty", () => {
      renderComponent();
      const undoBtn = screen.getByTitle("Undo");
      const redoBtn = screen.getByTitle("Redo");

      expect(undoBtn).toBeDisabled();
      expect(redoBtn).toBeDisabled();
      expect(undoBtn).toHaveClass("cursor-not-allowed");
    });
  });

  describe("Interaction Logic", () => {
    it("enables the undo button when canUndo is true", () => {
      store.set(atoms.canUndoAtom, true);
      renderComponent();

      const undoBtn = screen.getByTitle("Undo");
      expect(undoBtn).not.toBeDisabled();
      expect(undoBtn).toHaveClass("text-slate-600");
    });

    it("enables the redo button when canRedo is true", () => {
      store.set(atoms.canRedoAtom, true);
      renderComponent();

      const redoBtn = screen.getByTitle("Redo");
      expect(redoBtn).not.toBeDisabled();
    });

    it("triggers the undo action when the undo button is clicked", () => {
      store.set(atoms.canUndoAtom, true);
      renderComponent();

      fireEvent.click(screen.getByTitle("Undo"));

      expect(mockUndoAction).toHaveBeenCalledTimes(1);
    });

    it("triggers the redo action when the redo button is clicked", () => {
      store.set(atoms.canRedoAtom, true);
      renderComponent();

      fireEvent.click(screen.getByTitle("Redo"));

      expect(mockRedoAction).toHaveBeenCalledTimes(1);
    });
  });

  describe("Visual Feedback", () => {
    it("applies 'text-slate-300' when buttons are disabled", () => {
      store.set(atoms.canUndoAtom, false);
      renderComponent();

      const undoBtn = screen.getByTitle("Undo");
      expect(undoBtn).toHaveClass("text-slate-300");
      expect(undoBtn).toHaveClass("border-transparent");
    });

    it("applies 'text-slate-600' and border when buttons are enabled", () => {
      store.set(atoms.canRedoAtom, true);
      renderComponent();

      const redoBtn = screen.getByTitle("Redo");
      expect(redoBtn).toHaveClass("text-slate-600");
      expect(redoBtn).toHaveClass("border-slate-200");
    });
  });
});