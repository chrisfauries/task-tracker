import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { CategoryManagementDialog } from "./CategoryManagementDialog";
import { DatabaseService } from "../DatabaseService";
import { isCategoryManagementDialogOpenAtom, categoriesAtom } from "../atoms";
import type { CategoriesData, BoardData } from "../types";

// --- Mocks ---

// Mock DatabaseService
vi.mock("../DatabaseService", () => ({
  DatabaseService: {
    createCategory: vi.fn(),
    deleteCategory: vi.fn(),
    updateCategory: vi.fn(),
    subscribeToCategories: vi.fn(() => () => {}),
  },
}));

describe("CategoryManagementDialog", () => {
  let store: ReturnType<typeof createStore>;
  const onApplyMock = vi.fn();

  // Mock Data
  const mockCategories: CategoriesData = {
    "cat-1": { name: "Math", color: 0, items: ["Algebra", "Geometry"], order: 0 }, 
    "cat-2": { name: "Science", color: 1, items: ["Physics"], order: 1 }, 
  };

  const mockCategoriesUnordered: any = {
    "cat-A": { name: "First", items: [], order: 0 },
    "cat-B": { name: "Second", items: [], order: 1 },
    "cat-C": { name: "Third", items: [], order: 2 },
  };

  const mockBoardData: BoardData = {
    "worker-1": {
      name: "John Doe",
      defaultColor: 1, // Blue
      notes: {},
    },
    "worker-2": {
      name: "Jane Smith",
      defaultColor: 3, // Red
      notes: {},
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    store = createStore();
    // Default state: Open with data
    store.set(isCategoryManagementDialogOpenAtom, true);
    store.set(categoriesAtom, mockCategories);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderDialog = () => {
    return render(
      <Provider store={store}>
        <CategoryManagementDialog
          boardData={mockBoardData}
          onApply={onApplyMock}
        />
      </Provider>
    );
  };

  // --- Tests ---

  describe("Visibility & Rendering", () => {
    it("renders nothing when closed", () => {
      store.set(isCategoryManagementDialogOpenAtom, false);
      renderDialog();
      expect(screen.queryByText("Category Sets")).not.toBeInTheDocument();
    });

    it("renders correctly when open", () => {
      renderDialog();
      expect(screen.getByText("Category Sets")).toBeInTheDocument();
      // Should show categories
      expect(screen.getByText("Math")).toBeInTheDocument();
      expect(screen.getByText("Science")).toBeInTheDocument();
    });

    it("closes when the close button is clicked", async () => {
      renderDialog();
      // There are multiple "✕" buttons (close dialog, delete items). 
      // The close button is in the header (h2 sibling)
      const header = screen.getByRole("heading", { name: "Category Sets" }).closest("div");
      const closeBtn = within(header!).getByText("✕");
      fireEvent.click(closeBtn);

      await waitFor(() => {
        expect(store.get(isCategoryManagementDialogOpenAtom)).toBe(false);
      });
    });
  });

  describe("Sidebar (CRUD Operations)", () => {
    it("creates a new category via button", async () => {
      renderDialog();
      const input = screen.getByPlaceholderText("Category Name");
      const addBtn = screen.getByText("+");

      fireEvent.change(input, { target: { value: "History" } });
      fireEvent.click(addBtn);

      await waitFor(() => {
        // Mock categories max order is 1, so new one should be 2
        expect(DatabaseService.createCategory).toHaveBeenCalledWith("History", 0, 2);
      });
    });

    it("does not create a category if name is empty", async () => {
      renderDialog();
      const addBtn = screen.getByText("+");
      fireEvent.click(addBtn);
      
      // Wait a tick
      await new Promise(r => setTimeout(r, 0)); 
      expect(DatabaseService.createCategory).not.toHaveBeenCalled();
    });

    it("renders rename interface on pencil click", async () => {
      renderDialog();
      const renameBtns = screen.getAllByTitle("Rename");
      fireEvent.click(renameBtns[0]); // Click Math

      await waitFor(() => {
        expect(screen.getByDisplayValue("Math")).toBeInTheDocument();
        expect(screen.getByText("✓")).toBeInTheDocument();
      });
    });

    it("submits rename on confirm", async () => {
      renderDialog();
      const renameBtns = screen.getAllByTitle("Rename");
      fireEvent.click(renameBtns[0]);

      const input = screen.getByDisplayValue("Math");
      fireEvent.change(input, { target: { value: "Advanced Math" } });
      
      fireEvent.click(screen.getByText("✓"));

      await waitFor(() => {
        expect(DatabaseService.updateCategory).toHaveBeenCalledWith("cat-1", {
          name: "Advanced Math",
        });
      });
    });

    it("shows delete confirmation", async () => {
      renderDialog();
      const deleteBtns = screen.getAllByTitle("Delete");
      fireEvent.click(deleteBtns[0]);

      await waitFor(() => {
        expect(screen.getByText("Delete this?")).toBeInTheDocument();
      });
    });

    it("deletes category on confirmation", async () => {
      renderDialog();
      const deleteBtns = screen.getAllByTitle("Delete");
      fireEvent.click(deleteBtns[0]);
      
      const yesBtn = screen.getByText("Yes");
      fireEvent.click(yesBtn);

      await waitFor(() => {
        expect(DatabaseService.deleteCategory).toHaveBeenCalledWith("cat-1");
      });
    });
  });

  describe("Sidebar (Drag and Drop Sorting in Container)", () => {
    beforeEach(() => {
      store.set(categoriesAtom, mockCategoriesUnordered);
    });

    // Helper to setup geometry mocks on the prototype level
    // This handles any re-renders because we catch the call on any element instance
    const setupGeometry = () => {
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
        const id = this.getAttribute("data-category-id");
        
        // Items logic
        if (id === "cat-A") return { top: 0, height: 50, bottom: 50, left: 0, right: 100, width: 100, x: 0, y: 0, toJSON: () => {} } as DOMRect;
        if (id === "cat-B") return { top: 60, height: 50, bottom: 110, left: 0, right: 100, width: 100, x: 0, y: 60, toJSON: () => {} } as DOMRect;
        if (id === "cat-C") return { top: 120, height: 50, bottom: 170, left: 0, right: 100, width: 100, x: 0, y: 120, toJSON: () => {} } as DOMRect;
        
        // Container logic - crudely checking class since we don't have a testid on container in the component provided
        if (this.classList.contains("space-y-2")) {
           return { top: 0, height: 200, bottom: 200, left: 0, right: 100, width: 100, x: 0, y: 0, toJSON: () => {} } as DOMRect;
        }

        // Default empty rect
        return { top: 0, height: 0, bottom: 0, left: 0, right: 0, width: 0, x: 0, y: 0, toJSON: () => {} } as DOMRect;
      });

      // We also need to manually define offset properties on the specific instances found in the document
      // because JSDOM doesn't support them and they are read-only properties usually.
      const setOffsets = (text: string, top: number, height: number) => {
        const el = screen.getByText(text).closest("div[draggable]") as HTMLElement;
        if (el) {
          Object.defineProperty(el, 'offsetTop', { configurable: true, value: top });
          Object.defineProperty(el, 'offsetHeight', { configurable: true, value: height });
        }
      };
      
      setOffsets("First", 0, 50);
      setOffsets("Second", 60, 50);
      setOffsets("Third", 120, 50);

      // Return the container element
      return screen.getByText("First").closest(".space-y-2") as HTMLElement;
    };

    it("renders drag handle (hamburger icon)", () => {
      renderDialog();
      const handles = screen.getAllByTitle("Drag to reorder");
      expect(handles.length).toBe(3);
    });

    it("applies drag styling on drag start", () => {
      renderDialog();
      const firstItem = screen.getByText("First").closest("div[draggable]") as HTMLElement;
      
      fireEvent.dragStart(firstItem, {
        dataTransfer: {
            effectAllowed: "",
            setData: vi.fn(),
            getData: vi.fn(),
        }
      });
      
      expect(firstItem.className).toContain("opacity-25");
      expect(firstItem.className).toContain("border-dashed");
    });

    it.skip("calculates insert position and shows global indicator when dragging over container", async () => {
      renderDialog();
      const firstItem = screen.getByText("First").closest("div[draggable]") as HTMLElement;
      
      // Initialize Drag
      fireEvent.dragStart(firstItem, {
        dataTransfer: { effectAllowed: "", setData: vi.fn(), getData: vi.fn() }
      });

      // Wait for re-render to ensure nodes are stable
      await waitFor(() => expect(firstItem).toHaveClass("opacity-25"));

      const container = setupGeometry();

      // 1. Drag to Y=20 (Inside First [0-50], Midpoint 25) 
      // Logic: clientY (20) < Midpoint (25) -> Insert at 0. Top should be offsetTop of First (0)
      fireEvent.dragOver(container, { clientY: 20 });
      await waitFor(() => {
        const indicator = screen.getByTestId("drop-indicator");
        expect(indicator.style.top).toBe("0px");
      });

      // 2. Drag to Y=70 (Inside Second [60-110], Midpoint 85)
      // Logic: clientY (70) < Midpoint (85) -> Insert at 1. Top should be offsetTop of Second (60)
      fireEvent.dragOver(container, { clientY: 70 });
      await waitFor(() => {
        const indicator = screen.getByTestId("drop-indicator");
        expect(indicator.style.top).toBe("60px"); 
      });
    });

    it("reorders correctly when dropping", async () => {
      // Scenario: Move "First" (Order 0) to the bottom (Order 2)
      renderDialog();
      const firstItem = screen.getByText("First").closest("div[draggable]") as HTMLElement;
      
      // Start Drag
      fireEvent.dragStart(firstItem, {
        dataTransfer: { effectAllowed: "", setData: vi.fn(), getData: vi.fn() }
      });
      await waitFor(() => expect(firstItem).toHaveClass("opacity-25"));

      const container = setupGeometry();

      // Drag to Y=150 (Bottom half of Third [120-170], Midpoint 145)
      // Logic: clientY (150) > Midpoint (145) -> loop finishes, inserts at end.
      fireEvent.dragOver(container, { clientY: 150 });

      // Drop
      fireEvent.drop(container);

      await waitFor(() => {
        expect(DatabaseService.updateCategory).toHaveBeenCalledWith("cat-A", { order: 2 });
      });
    });
  });

  describe("Editor Content", () => {
    beforeEach(async () => {
      renderDialog();
      // Select "Math" to open editor
      fireEvent.click(screen.getByText("Math"));
      await waitFor(() => screen.getByText("Category Color"));
    });

    it("updates item text on change", async () => {
      const itemInput = screen.getByDisplayValue("Algebra");
      fireEvent.change(itemInput, { target: { value: "Linear Algebra" } });

      await waitFor(() => {
        expect(DatabaseService.updateCategory).toHaveBeenCalledWith("cat-1", {
          items: ["Linear Algebra", "Geometry"],
        });
      });
    });

    it("adds a new item", async () => {
      const addBtn = screen.getByText("+ Add Item");
      fireEvent.click(addBtn);

      await waitFor(() => {
        expect(DatabaseService.updateCategory).toHaveBeenCalledWith("cat-1", {
          items: ["Algebra", "Geometry", "New Item"],
        });
      });
    });

    it("deletes an item", async () => {
      // Isolate the items section to avoid clicking the main dialog close button
      const editSection = screen.getByText("Edit Items").closest("section");
      
      // Find buttons inside the edit section specifically
      const deleteBtns = within(editSection!).getAllByText("✕"); 
      
      // Delete "Algebra" (Index 0)
      fireEvent.click(deleteBtns[0]); 

      await waitFor(() => {
        expect(DatabaseService.updateCategory).toHaveBeenCalledWith("cat-1", {
          items: ["Geometry"],
        });
      });
    });

    it("updates color", async () => {
      const colorSection = screen.getByText("Category Color").closest("section");
      const buttons = within(colorSection!).getAllByRole("button");
      
      fireEvent.click(buttons[1]);

      await waitFor(() => {
        expect(DatabaseService.updateCategory).toHaveBeenCalledWith("cat-1", {
          color: 1,
        });
      });
    });
  });

  describe("Board Integration", () => {
    beforeEach(async () => {
      renderDialog();
      fireEvent.click(screen.getByText("Math"));
      await waitFor(() => screen.getByText("Push Category to Board"));
    });

    it("calls onApply when a specific column button is clicked", async () => {
      // Find row for John Doe
      const workerRow = screen.getByText("John Doe").closest("div");
      
      // Click "Assigned" (index 0)
      const assignedBtn = within(workerRow!).getByText("Assigned");
      fireEvent.click(assignedBtn);

      await waitFor(() => {
        // onApply(catId, workerId, colIndex)
        expect(onApplyMock).toHaveBeenCalledWith("cat-1", "worker-1", 0);
      });
    });

    it("shows success notification after applying", async () => {
      const workerRow = screen.getByText("John Doe").closest("div");
      fireEvent.click(within(workerRow!).getByText("Assigned"));

      await waitFor(() => {
        expect(screen.getByText("Success")).toBeInTheDocument();
        expect(screen.getByText(/Successfully added items to John Doe/)).toBeInTheDocument();
      });

      // Close notification
      fireEvent.click(screen.getByText("Okay"));
      await waitFor(() => {
        expect(screen.queryByText("Success")).not.toBeInTheDocument();
      });
    });
  });
});