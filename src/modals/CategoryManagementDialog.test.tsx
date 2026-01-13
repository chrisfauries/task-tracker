import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { CategoryManagementDialog } from "./CategoryManagementDialog";
import { DatabaseService } from "../DatabaseService";
import { isCategoryManagementDialogOpenAtom, categoriesAtom } from "../atoms";
import type { CategoriesData, BoardData } from "../types";

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

  const mockCategories: CategoriesData = {
    "cat-1": { name: "Math", color: 0, items: ["Algebra", "Geometry"] }, // 0 = Green
    "cat-2": { name: "Science", color: 1, items: ["Physics"] }, // 1 = Blue
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
    store.set(isCategoryManagementDialogOpenAtom, true);
    store.set(categoriesAtom, mockCategories);
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

  describe("Visibility & Rendering", () => {
    it("renders nothing when closed", () => {
      store.set(isCategoryManagementDialogOpenAtom, false);
      renderDialog();
      expect(screen.queryByText("Category Sets")).not.toBeInTheDocument();
    });

    it("renders correctly when open", () => {
      renderDialog();
      expect(screen.getByText("Category Sets")).toBeInTheDocument();
      expect(screen.getByText("Math")).toBeInTheDocument();
      expect(screen.getByText("Science")).toBeInTheDocument();
    });

    it("closes when the close button is clicked", async () => {
      renderDialog();
      const closeBtn = screen.getByText("✕");
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
        expect(DatabaseService.createCategory).toHaveBeenCalledWith("History");
      });
    });

    it("does not create a category if name is empty", async () => {
      renderDialog();
      const addBtn = screen.getByText("+");
      fireEvent.click(addBtn);
      
      // Wait to ensure no call happens (sanity check for async effects)
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
      // Enter edit mode
      const renameBtns = screen.getAllByTitle("Rename");
      fireEvent.click(renameBtns[0]);

      // Change text
      const input = screen.getByDisplayValue("Math");
      fireEvent.change(input, { target: { value: "Advanced Math" } });
      
      // Click confirm
      fireEvent.click(screen.getByText("✓"));

      await waitFor(() => {
        expect(DatabaseService.updateCategory).toHaveBeenCalledWith("cat-1", {
          name: "Advanced Math",
        });
      });
    });

    it("cancels rename on X", async () => {
      renderDialog();
      const renameBtns = screen.getAllByTitle("Rename");
      fireEvent.click(renameBtns[0]);

      const input = screen.getByDisplayValue("Math");
      fireEvent.change(input, { target: { value: "Wrong" } });
      
      const renameContainer = input.parentElement;
      const cancelBtn = within(renameContainer!).getByText("✕");
      
      fireEvent.click(cancelBtn);

      await waitFor(() => {
        expect(DatabaseService.updateCategory).not.toHaveBeenCalled();
        expect(screen.getByText("Math")).toBeInTheDocument();
      });
    });

    it("shows delete confirmation", async () => {
      renderDialog();
      const deleteBtns = screen.getAllByTitle("Delete");
      fireEvent.click(deleteBtns[0]);

      await waitFor(() => {
        expect(screen.getByText("Delete this?")).toBeInTheDocument();
        expect(screen.getByText("Yes")).toBeInTheDocument();
        expect(screen.getByText("No")).toBeInTheDocument();
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

    it("cancels delete", async () => {
      renderDialog();
      const deleteBtns = screen.getAllByTitle("Delete");
      fireEvent.click(deleteBtns[0]);
      
      const noBtn = screen.getByText("No");
      fireEvent.click(noBtn);

      await waitFor(() => {
        expect(DatabaseService.deleteCategory).not.toHaveBeenCalled();
        expect(screen.queryByText("Delete this?")).not.toBeInTheDocument();
      });
    });
  });

  describe("Editor Selection Logic", () => {
    it("shows empty state initially or when invalid selection", () => {
      renderDialog();
      expect(
        screen.getByText(/Select a category from the left/i)
      ).toBeInTheDocument();
      expect(screen.queryByText("Edit Items")).not.toBeInTheDocument();
    });

    it("shows editor when valid category clicked", async () => {
      renderDialog();
      fireEvent.click(screen.getByText("Math"));
      
      await waitFor(() => {
        expect(screen.getByText("Edit Items")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Algebra")).toBeInTheDocument();
      });
    });

    it("returns to empty state if selected category is deleted", async () => {
      renderDialog();
      
      // Select
      fireEvent.click(screen.getByText("Math"));
      await waitFor(() => expect(screen.getByText("Edit Items")).toBeInTheDocument());

      // Delete
      const deleteBtns = screen.getAllByTitle("Delete");
      fireEvent.click(deleteBtns[0]);
      
      const yesBtn = screen.getByText("Yes");
      fireEvent.click(yesBtn);

      // Verify empty state returns
      await waitFor(() => {
        expect(screen.queryByText("Edit Items")).not.toBeInTheDocument();
      });
    });
  });

  describe("Editor Content (Items & Color)", () => {
    beforeEach(async () => {
      renderDialog();
      fireEvent.click(screen.getByText("Math"));
      await waitFor(() => screen.getByText("Category Color"));
    });

    it("updates color when a new color circle is clicked", async () => {
      const editor = screen.getByText("Category Color").parentElement;
      const buttons = within(editor!).getAllByRole("button");
      
      // Red is index 3, which maps to class "bg-user-4"
      const redBtn = buttons.find(b => b.className.includes("bg-user-4"));
      
      if (!redBtn) throw new Error("Red color button not found");
      
      fireEvent.click(redBtn);

      await waitFor(() => {
        expect(DatabaseService.updateCategory).toHaveBeenCalledWith("cat-1", {
          color: 3, // Expect 3 for Red
        });
      });
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

    it("deletes an item from the list", async () => {
      const itemInput = screen.getByDisplayValue("Algebra");
      const row = itemInput.parentElement;
      const deleteBtn = within(row!).getByText("✕");

      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(DatabaseService.updateCategory).toHaveBeenCalledWith("cat-1", {
          items: ["Geometry"],
        });
      });
    });

    it("adds a new item via button", async () => {
      const addBtn = screen.getByText("+ Add Item");
      fireEvent.click(addBtn);

      await waitFor(() => {
        expect(DatabaseService.updateCategory).toHaveBeenCalledWith("cat-1", {
          items: ["Algebra", "Geometry", "New Item"],
        });
      });
    });

    it("adds a new item via Enter key on existing input", async () => {
      const itemInput = screen.getByDisplayValue("Algebra");
      fireEvent.keyDown(itemInput, { key: "Enter", code: "Enter", charCode: 13 });

      await waitFor(() => {
        expect(DatabaseService.updateCategory).toHaveBeenCalledWith("cat-1", {
          items: ["Algebra", "Geometry", ""],
        });
      });
    });
  });

  describe("Board Integration (Pushing)", () => {
    beforeEach(async () => {
      renderDialog();
      fireEvent.click(screen.getByText("Math"));
      await waitFor(() => screen.getByText("Push Category to Board"));
    });

    it("renders worker rows in the push section", () => {
      expect(screen.getByText("Push Category to Board")).toBeInTheDocument();
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    it("calls onApply when a specific column button is clicked", async () => {
      const workerRow = screen.getByText("John Doe").closest("div");
      const assignedBtn = within(workerRow!).getByText("Assigned");
      fireEvent.click(assignedBtn);

      await waitFor(() => {
        expect(onApplyMock).toHaveBeenCalledWith("cat-1", "worker-1", 0);
      });
    });

    it("calls onApply with correct index for other columns", async () => {
      const workerRow = screen.getByText("Jane Smith").closest("div");
      const doneBtn = within(workerRow!).getByText("Done");
      fireEvent.click(doneBtn);

      await waitFor(() => {
        expect(onApplyMock).toHaveBeenCalledWith("cat-1", "worker-2", 2);
      });
    });

    it("shows success message after applying", async () => {
      const workerRow = screen.getByText("John Doe").closest("div");
      fireEvent.click(within(workerRow!).getByText("Active"));

      await waitFor(() => {
        expect(screen.getByText("Success")).toBeInTheDocument();
        expect(
          screen.getByText(/Successfully added items to John Doe/)
        ).toBeInTheDocument();
      });
    });

    it("closes success message", async () => {
      // Trigger success
      const workerRow = screen.getByText("John Doe").closest("div");
      fireEvent.click(within(workerRow!).getByText("Active"));
      await waitFor(() => screen.getByText("Success"));

      const okayBtn = screen.getByText("Okay");
      fireEvent.click(okayBtn);

      await waitFor(() => {
        expect(screen.queryByText("Success")).not.toBeInTheDocument();
      });
    });
  });
});