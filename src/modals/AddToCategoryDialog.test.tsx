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
    getNote: vi.fn().mockResolvedValue({ color: 0 }), // Mock getNote for color fetching (0=Green)
    // We mock the subscription to avoid actual implementation interference,
    // though we will manually inject data into the atom store.
    subscribeToCategories: vi.fn(() => () => {}),
  },
}));

describe("AddToCategoryDialog", () => {
  const mockCategories: CategoriesData = {
    cat1: { name: "Work", items: ["Task 1"], color: 1 }, // 1 = Blue
    cat2: { name: "Personal", items: [], color: 0 }, // 0 = Green
  };

  const mockTargetNote = {
    id: "note123",
    workerId: "workerABC",
    text: "My Important Task",
    color: 0, // Green
  };

  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    store.set(isAddToCategoryDialogOpenAtom, true);
    store.set(addToCategoryTargetAtom, mockTargetNote);
    store.set(categoriesAtom, mockCategories);
    vi.clearAllMocks();
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
    expect(screen.getByPlaceholderText("Category Name")).toBeInTheDocument();
    expect(screen.getByText("Work")).toBeInTheDocument();
    expect(screen.getByText("Personal")).toBeInTheDocument();
  });

  it("renders correctly without categories", () => {
    store.set(categoriesAtom, {});
    renderDialog();
    expect(screen.getByText(/No categories available/i)).toBeInTheDocument();
  });

  it("closes when close button is clicked", async () => {
    renderDialog();
    const closeBtn = screen.getByText("✕");
    fireEvent.click(closeBtn);
    
    await waitFor(() => {
      expect(store.get(isAddToCategoryDialogOpenAtom)).toBe(false);
    });
  });

  it("selects an existing category and updates database", async () => {
    renderDialog();

    const workBtn = screen.getByText("Work");
    fireEvent.click(workBtn);

    await waitFor(() => {
      // 1. Check note category update
      expect(DatabaseService.updateNoteCategory).toHaveBeenCalledWith(
        mockTargetNote.workerId,
        mockTargetNote.id,
        "Work",
        1 // Expect Blue color index
      );
      // 2. Check category items update
      expect(DatabaseService.updateCategory).toHaveBeenCalledWith("cat1", {
        items: ["Task 1", mockTargetNote.text],
      });
      // 3. Dialog closed
      expect(store.get(isAddToCategoryDialogOpenAtom)).toBe(false);
    });
  });

  it("creates category and adds note after propagation", async () => {
    // Mock createCategory to return a new ID
    (DatabaseService.createCategory as any).mockResolvedValue("newCatId");

    renderDialog();

    const input = screen.getByPlaceholderText("Category Name");
    const createBtn = screen.getByText("Create and Add");

    // Type new name
    fireEvent.change(input, { target: { value: "Urgent" } });

    // Click create
    fireEvent.click(createBtn);

    // Expect create call with default color 0 (Green)
    await waitFor(() => {
        expect(DatabaseService.createCategory).toHaveBeenCalledWith(
            "Urgent",
            0
        );
    });
    
    expect(createBtn).toHaveTextContent("Creating...");
    expect(createBtn).toBeDisabled();

    // Now simulate the prop update that happens when DB changes
    const newCategories = {
      ...mockCategories,
      newCatId: { name: "Urgent", items: [], color: 0 },
    };
    store.set(categoriesAtom, newCategories);

    // Wait for the effect to trigger selection
    await waitFor(() => {
      expect(DatabaseService.updateNoteCategory).toHaveBeenCalledWith(
        mockTargetNote.workerId,
        mockTargetNote.id,
        "Urgent",
        0
      );
      expect(store.get(isAddToCategoryDialogOpenAtom)).toBe(false);
    });
  });

  it("creates category with specific color when selected", async () => {
    (DatabaseService.createCategory as any).mockResolvedValue("blueCatId");
    renderDialog();

    const input = screen.getByPlaceholderText("Category Name");

    // Find the Blue color button by its new title format "Color 2" (Index 1)
    const blueButton = screen.getByTitle("Color 2");
    fireEvent.click(blueButton);

    fireEvent.change(input, { target: { value: "Blue Team" } });
    fireEvent.click(screen.getByText("Create and Add"));

    await waitFor(() => {
        expect(DatabaseService.createCategory).toHaveBeenCalledWith(
        "Blue Team",
        1 // Expect Blue index
        );
    });
  });

  it("creates category on Enter key press", async () => {
    renderDialog();
    const input = screen.getByPlaceholderText("Category Name");
    fireEvent.change(input, { target: { value: "Enter Cat" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter", charCode: 13 });

    // Expect default color 0 (Green)
    await waitFor(() => {
        expect(DatabaseService.createCategory).toHaveBeenCalledWith(
        "Enter Cat",
        0
        );
    });
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
      // Should revert to "Create and Add"
      expect(screen.getByText("Create and Add")).toBeInTheDocument();
      expect(screen.getByText("Create and Add")).not.toBeDisabled();
    });
  });
});