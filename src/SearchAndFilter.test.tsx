import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { SearchAndFilter } from "./SearchAndFilter";
import {
  searchQueryAtom,
  selectedCategoriesAtom,
  categoriesAtom,
} from "./atoms";
import type { CategoriesData } from "./types";

describe("SearchAndFilter Component", () => {
  let store: ReturnType<typeof createStore>;

  const mockCategories: CategoriesData = {
    cat1: { name: "Work", items: [] },
    cat2: { name: "Personal", items: [] },
    cat3: { name: "Urgent", items: [] },
  };

  beforeEach(() => {
    store = createStore();
    store.set(categoriesAtom, mockCategories);
    store.set(searchQueryAtom, "");
    store.set(selectedCategoriesAtom, []);
  });

  const renderComponent = () => {
    return render(
      <Provider store={store}>
        <SearchAndFilter />
      </Provider>
    );
  };

  describe("Search Functionality", () => {
    it("updates the search query atom when typing", () => {
      renderComponent();
      const input = screen.getByPlaceholderText("Search...");

      fireEvent.change(input, { target: { value: "meeting" } });

      expect(store.get(searchQueryAtom)).toBe("meeting");
    });

    it("clears the search query when the clear button is clicked", () => {
      store.set(searchQueryAtom, "test query");
      renderComponent();

      const input = screen.getByPlaceholderText("Search...") as HTMLInputElement;
      expect(input.value).toBe("test query");

      // Find the clear button by its title
      const clearBtn = screen.getByTitle("Clear search");
      fireEvent.click(clearBtn);

      expect(store.get(searchQueryAtom)).toBe("");
      expect(input.value).toBe("");
    });
  });

  describe("Filter Menu Functionality", () => {
    it("toggles the filter menu when clicking the filter icon", () => {
      renderComponent();

      // Initially closed
      expect(screen.queryByText("Categories")).not.toBeInTheDocument();

      // Find the filter toggle button (it has title="Filter by category")
      const toggleBtn = screen.getByTitle("Filter by category");
      fireEvent.click(toggleBtn);

      // Now open
      expect(screen.getByText("Categories")).toBeInTheDocument();
      expect(screen.getByText("Work")).toBeInTheDocument();

      // Click again to close
      fireEvent.click(toggleBtn);
      expect(screen.queryByText("Categories")).not.toBeInTheDocument();
    });

    it("closes the filter menu when clicking outside", () => {
      renderComponent();
      const toggleBtn = screen.getByTitle("Filter by category");
      fireEvent.click(toggleBtn);

      expect(screen.getByText("Categories")).toBeInTheDocument();

      // Click on document body
      fireEvent.mouseDown(document.body);

      expect(screen.queryByText("Categories")).not.toBeInTheDocument();
    });

    it("displays 'No categories defined' if atom is empty", () => {
      store.set(categoriesAtom, {});
      renderComponent();
      
      const toggleBtn = screen.getByTitle("Filter by category");
      fireEvent.click(toggleBtn);

      expect(screen.getByText("No categories defined")).toBeInTheDocument();
    });
  });

  describe("Category Selection", () => {
    it("toggles categories in the atom when clicked", () => {
      renderComponent();
      // Open menu
      fireEvent.click(screen.getByTitle("Filter by category"));

      const workCheckbox = screen.getByLabelText("Work") as HTMLInputElement;
      const personalCheckbox = screen.getByLabelText("Personal") as HTMLInputElement;

      // Select Work
      fireEvent.click(workCheckbox);
      expect(store.get(selectedCategoriesAtom)).toContain("Work");
      expect(workCheckbox.checked).toBe(true);

      // Select Personal
      fireEvent.click(personalCheckbox);
      expect(store.get(selectedCategoriesAtom)).toEqual(expect.arrayContaining(["Work", "Personal"]));

      // Deselect Work
      fireEvent.click(workCheckbox);
      expect(store.get(selectedCategoriesAtom)).not.toContain("Work");
      expect(store.get(selectedCategoriesAtom)).toContain("Personal");
    });

    it("shows the active filter count badge on the button", () => {
      store.set(selectedCategoriesAtom, ["Work", "Urgent"]);
      renderComponent();

      const toggleBtn = screen.getByTitle("Filter by category");
      expect(toggleBtn).toHaveTextContent("2");
    });

    it("clears all selected categories when 'Clear all' is clicked", () => {
      store.set(selectedCategoriesAtom, ["Work", "Urgent"]);
      renderComponent();

      // Open menu
      fireEvent.click(screen.getByTitle("Filter by category"));

      // Find "Clear all" button
      const clearAllBtn = screen.getByText("Clear all");
      fireEvent.click(clearAllBtn);

      expect(store.get(selectedCategoriesAtom)).toEqual([]);
      expect(screen.queryByText("Clear all")).not.toBeInTheDocument();
    });
  });
});