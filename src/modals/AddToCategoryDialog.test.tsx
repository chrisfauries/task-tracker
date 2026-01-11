import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AddToCategoryDialog } from "./AddToCategoryDialog";
import { DatabaseService } from "../DatabaseService";
import { Provider, createStore } from "jotai";
import {
  isAddToCategoryDialogOpenAtom,
  addToCategoryTargetAtom,
  categoriesAtom,
} from "../atoms";
import type { CategoriesData } from "../types";

// Mock DatabaseService
vi.mock("../DatabaseService", () => ({
  DatabaseService: {
    createCategory: vi.fn(),
    updateNoteCategory: vi.fn(),
    updateCategory: vi.fn(),
    // We mock the subscription to avoid actual implementation interference,
    // though we will manually inject data into the atom store.
    subscribeToCategories: vi.fn(() => () => {}),
  },
}));

describe("AddToCategoryDialog", () => {
  const mockCategories: CategoriesData = {
    cat1: { name: "Work", items: ["Task 1"], color: "Blue" },
    cat2: { name: "Personal", items: [], color: "Green" },
  };

  const mockTargetNote = {
    id: "note123",
    workerId: "workerABC",
    text: "My Important Task",
  };

  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    store = createStore();
    // Setup initial state in the store
    store.set(isAddToCategoryDialogOpenAtom, true);
    store.set(addToCategoryTargetAtom, mockTargetNote);
    store.set(categoriesAtom, mockCategories);
  });

  const renderDialog = () => {
    return render(
      <Provider store={store}>
        <AddToCategoryDialog />
      </Provider>
    );
  };

  it("renders nothing when closed", () => {
    store.set(isAddToCategoryDialogOpenAtom, false);
    renderDialog();
    expect(screen.queryByText("Add to Category...")).not.toBeInTheDocument();
  });

  it("renders correctly when open with categories", () => {
    renderDialog();
    expect(screen.getByText("Add to Category...")).toBeInTheDocument();
    expect(screen.getByText("Work")).toBeInTheDocument();
    expect(screen.getByText("Personal")).toBeInTheDocument();
  });

  it("renders correctly without categories", () => {
    store.set(categoriesAtom, {});
    renderDialog();
    expect(screen.getByText(/No categories available/i)).toBeInTheDocument();
  });

  it("auto-focuses the new category input", () => {
    renderDialog();
    const input = screen.getByPlaceholderText("Category Name");
    expect(input).toHaveFocus();
  });

  it("closes when close button is clicked", async () => {
    renderDialog();
    fireEvent.click(screen.getByText("✕"));

    await waitFor(() => {
      expect(store.get(isAddToCategoryDialogOpenAtom)).toBe(false);
    });
  });

  it("adds note to existing category on selection", async () => {
    renderDialog();
    fireEvent.click(screen.getByText("Work"));

    await waitFor(() => {
      // 1. Should update note's category metadata
      expect(DatabaseService.updateNoteCategory).toHaveBeenCalledWith(
        mockTargetNote.workerId,
        mockTargetNote.id,
        "Work",
        "Blue"
      );
      // 2. Should add note text to category items
      expect(DatabaseService.updateCategory).toHaveBeenCalledWith("cat1", {
        items: ["Task 1", "My Important Task"],
      });
      // 3. Should close dialog
      expect(store.get(isAddToCategoryDialogOpenAtom)).toBe(false);
      expect(store.get(addToCategoryTargetAtom)).toBeNull();
    });
  });

  it("creates category and adds note after propagation", async () => {
    const newId = "cat_new";
    (DatabaseService.createCategory as any).mockResolvedValue(newId);

    renderDialog();

    // 1. Enter new category name
    const input = screen.getByPlaceholderText("Category Name");
    fireEvent.change(input, { target: { value: "Urgent" } });

    // 2. Click Create
    const createBtn = screen.getByText("Create and Add");
    fireEvent.click(createBtn);

    expect(DatabaseService.createCategory).toHaveBeenCalledWith("Urgent");
    expect(createBtn).toHaveTextContent("Creating...");
    expect(createBtn).toBeDisabled();

    // The dialog waits for the category to appear in the atom.
    // Simulate the database update propagating to the atom:
    const updatedCategories = {
      ...mockCategories,
      [newId]: { name: "Urgent", items: [], color: "Green" },
    };

    // Updating the store should trigger the useEffect in the component
    store.set(categoriesAtom, updatedCategories);

    await waitFor(() => {
      // Verify assignment logic ran for the NEW category
      expect(DatabaseService.updateNoteCategory).toHaveBeenCalledWith(
        mockTargetNote.workerId,
        mockTargetNote.id,
        "Urgent",
        "Green"
      );
      expect(store.get(isAddToCategoryDialogOpenAtom)).toBe(false);
    });
  });

  it("creates category on Enter key press", () => {
    renderDialog();
    const input = screen.getByPlaceholderText("Category Name");
    fireEvent.change(input, { target: { value: "Enter Cat" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter", charCode: 13 });

    expect(DatabaseService.createCategory).toHaveBeenCalledWith("Enter Cat");
  });

  it("does not create category on Enter if input is empty", () => {
    renderDialog();
    const input = screen.getByPlaceholderText("Category Name");
    fireEvent.keyDown(input, { key: "Enter", code: "Enter", charCode: 13 });
    expect(DatabaseService.createCategory).not.toHaveBeenCalled();
  });

  it("handles creation errors gracefully", async () => {
    (DatabaseService.createCategory as any).mockRejectedValue(
      new Error("Network Error")
    );

    renderDialog();

    const input = screen.getByPlaceholderText("Category Name");
    fireEvent.change(input, { target: { value: "Fail Cat" } });
    fireEvent.click(screen.getByText("Create and Add"));

    await waitFor(() => {
      expect(screen.getByText("Create and Add")).toBeInTheDocument();
      expect(screen.getByText("Create and Add")).not.toBeDisabled();
    });
  });
});
