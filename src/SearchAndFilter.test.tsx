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
    cat1: { name: "Work", items: [], order: 0 },
    cat2: { name: "Personal", items: [], order: 1 },
    cat3: { name: "Urgent", items: [], order: 2 },
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

    it("clears search query when clear button is clicked", () => {
      store.set(searchQueryAtom, "test");
      renderComponent();

      const clearBtn = screen.getByText("✕");
      fireEvent.click(clearBtn);

      expect(store.get(searchQueryAtom)).toBe("");
    });
  });

  describe("Filter Functionality", () => {
    it("toggles the filter menu", () => {
      renderComponent();
      
      // Initially closed
      expect(screen.queryByText("Categories")).not.toBeInTheDocument();

      // Click to open
      const toggleBtn = screen.getByTitle("Filter by category");
      fireEvent.click(toggleBtn);

      // Now open
      expect(screen.getByText("Categories")).toBeInTheDocument();
      expect(screen.getByText("Work")).toBeInTheDocument();
    });

    it("renders categories in sorted order", () => {
      const unsortedCategories: CategoriesData = {
        cat1: { name: "Third", items: [], order: 3 },
        cat2: { name: "First", items: [], order: 1 },
        cat3: { name: "Second", items: [], order: 2 },
      };
      store.set(categoriesAtom, unsortedCategories);
      renderComponent();

      // Open menu
      fireEvent.click(screen.getByTitle("Filter by category"));

      // Check order of elements in the DOM
      const labels = screen.getAllByRole("checkbox").map(
        (cb) => cb.nextSibling?.textContent
      );
      expect(labels).toEqual(["First", "Second", "Third"]);
    });

    it("toggles category selection", () => {
      renderComponent();
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
    });
  });
});