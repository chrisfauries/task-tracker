import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { ImportExportDialog } from "./ImportExportDialog";
import { DatabaseService } from "../DatabaseService";
import { isImportExportDialogOpenAtom, categoriesAtom } from "../atoms";
import type { BoardData, CategoriesData } from "../types";

// Mock DatabaseService
vi.mock("../DatabaseService", () => ({
  DatabaseService: {
    restoreBackup: vi.fn(),
    subscribeToCategories: vi.fn(() => () => {}),
    subscribeToSnapshots: vi.fn(() => () => {}),
    subscribeToCustomPalette: vi.fn(() => () => {}),
  },
}));

describe("ImportExportDialog", () => {
  let store: ReturnType<typeof createStore>;
  
  // Define variables for spies
  let mockAlert: ReturnType<typeof vi.spyOn>;
  let mockConsoleError: ReturnType<typeof vi.spyOn>;

  const mockBoardData: BoardData = {
    "w1": { name: "Worker 1", notes: {}, defaultColor: 0 }
  };
  
  const mockCategories: CategoriesData = {
    "c1": { name: "Category 1", items: [], color: 1 }
  };

  beforeEach(() => {
    store = createStore();
    store.set(isImportExportDialogOpenAtom, true);
    store.set(categoriesAtom, mockCategories);
    
    // Initialize spies here so they are fresh for each test
    mockAlert = vi.spyOn(window, "alert").mockImplementation(() => {});
    mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore implementations to prevent leakage (crucial for document.createElement)
    vi.restoreAllMocks();
  });

  const renderDialog = () => {
    return render(
      <Provider store={store}>
        <ImportExportDialog boardData={mockBoardData} />
      </Provider>
    );
  };

  it("renders nothing when closed", () => {
    store.set(isImportExportDialogOpenAtom, false);
    renderDialog();
    expect(screen.queryByText("Data Management")).not.toBeInTheDocument();
  });

  it("renders correctly when open", () => {
    renderDialog();
    expect(screen.getByText("Data Management")).toBeInTheDocument();
    expect(screen.getByText("Export Backup")).toBeInTheDocument();
    expect(screen.getByText("Import Backup")).toBeInTheDocument();
  });

  it("closes when the close button is clicked", async () => {
    renderDialog();
    const closeBtn = screen.getByText("✕");
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(store.get(isImportExportDialogOpenAtom)).toBe(false);
    });
  });

  describe("Export Functionality", () => {
    it("generates a download link with correct data when 'Download Backup' is clicked", () => {
      renderDialog();

      // 1. Capture original implementation to allow React to render normally
      const originalCreateElement = document.createElement.bind(document);
      
      // 2. Spy on createElement
      const createElementSpy = vi.spyOn(document, "createElement");
      const clickSpy = vi.fn();
      
      // 3. Mock ONLY the 'a' tag creation, pass everything else to original
      createElementSpy.mockImplementation((tagName: string, options) => {
        if (tagName === "a") {
          return {
            setAttribute: vi.fn(),
            click: clickSpy,
            remove: vi.fn(),
            appendChild: vi.fn(),
            style: {},
          } as unknown as HTMLElement;
        }
        return originalCreateElement(tagName, options);
      });

      const appendSpy = vi.spyOn(document.body, "appendChild").mockImplementation((node) => node);

      const downloadBtn = screen.getByText("Download Backup");
      fireEvent.click(downloadBtn);

      expect(createElementSpy).toHaveBeenCalledWith("a");
      
      // Verify the data URI content
      const anchor = createElementSpy.mock.results.find(r => r.value.click === clickSpy)?.value;
      const setAttributeCalls = anchor.setAttribute.mock.calls;
      
      // Find the href call
      const hrefCall = setAttributeCalls.find((call: string[]) => call[0] === "href");
      expect(hrefCall).toBeDefined();
      
      const dataUri = hrefCall[1];
      expect(dataUri).toContain("data:text/json;charset=utf-8,");
      
      // Decode and verify payload
      const jsonString = decodeURIComponent(dataUri.split(",")[1]);
      const jsonData = JSON.parse(jsonString);

      expect(jsonData).toMatchObject({
        version: 1,
        boardData: mockBoardData,
        categories: mockCategories,
      });
      expect(jsonData.timestamp).toBeDefined();

      // Verify click was triggered
      expect(clickSpy).toHaveBeenCalled();
      expect(appendSpy).toHaveBeenCalled();
    });
  });

  describe("Import Functionality", () => {
    const createMockFile = (content: object | string, name = "backup.json") => {
        const str = typeof content === "string" ? content : JSON.stringify(content);
        return new File([str], name, { type: "application/json" });
    };

    it("shows confirmation screen upon selecting a file", async () => {
        const { container } = renderDialog();
        
        const fileInput = container.querySelector('input[type="file"]');
        if (!fileInput) throw new Error("File input not found");

        const file = createMockFile({ boardData: {}, categories: {} });
        
        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => {
            expect(screen.getByText("⚠️ Are you sure?")).toBeInTheDocument();
            expect(screen.getByText("backup.json")).toBeInTheDocument();
            expect(screen.getByText("Yes, Overwrite")).toBeInTheDocument();
        });
    });

    it("resets to initial state when 'Cancel' is clicked during confirmation", async () => {
        const { container } = renderDialog();
        
        const fileInput = container.querySelector('input[type="file"]');
        if (!fileInput) throw new Error("File input not found");

        const file = createMockFile({});
        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => screen.getByText("Cancel"));
        
        fireEvent.click(screen.getByText("Cancel"));

        await waitFor(() => {
            expect(screen.queryByText("⚠️ Are you sure?")).not.toBeInTheDocument();
            expect(screen.getByText("Select Backup File...")).toBeInTheDocument();
        });
    });

    it("successfully restores valid backup data", async () => {
        const { container } = renderDialog();

        const validBackup = {
            boardData: { wNew: { name: "New Worker" } },
            categories: { cNew: { name: "New Cat" } }
        };
        const file = createMockFile(validBackup);
        
        const fileInput = container.querySelector('input[type="file"]');
        if (!fileInput) throw new Error("File input not found");

        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => screen.getByText("Yes, Overwrite"));
        fireEvent.click(screen.getByText("Yes, Overwrite"));

        await waitFor(() => {
            expect(DatabaseService.restoreBackup).toHaveBeenCalledWith(
                validBackup.boardData,
                validBackup.categories
            );
            expect(mockAlert).toHaveBeenCalledWith("Board restored successfully!");
            expect(store.get(isImportExportDialogOpenAtom)).toBe(false);
        });
    });

    it("alerts and logs error when file is invalid JSON", async () => {
        const { container } = renderDialog();

        const invalidFile = createMockFile("This is not JSON");
        
        const fileInput = container.querySelector('input[type="file"]');
        if (!fileInput) throw new Error("File input not found");

        fireEvent.change(fileInput, { target: { files: [invalidFile] } });

        await waitFor(() => screen.getByText("Yes, Overwrite"));
        fireEvent.click(screen.getByText("Yes, Overwrite"));

        await waitFor(() => {
            expect(mockAlert).toHaveBeenCalledWith("Failed to parse backup file.");
            expect(mockConsoleError).toHaveBeenCalled();
            expect(DatabaseService.restoreBackup).not.toHaveBeenCalled();
            // Should stay open to allow retry
            expect(store.get(isImportExportDialogOpenAtom)).toBe(true);
        });
    });

    it("alerts when JSON structure is missing required fields", async () => {
        const { container } = renderDialog();

        // Valid JSON but missing boardData/categories
        const incompleteBackup = { version: 1 }; 
        const file = createMockFile(incompleteBackup);
        
        const fileInput = container.querySelector('input[type="file"]');
        if (!fileInput) throw new Error("File input not found");

        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => screen.getByText("Yes, Overwrite"));
        fireEvent.click(screen.getByText("Yes, Overwrite"));

        await waitFor(() => {
            expect(mockAlert).toHaveBeenCalledWith("Invalid backup file: Missing board data.");
            expect(DatabaseService.restoreBackup).not.toHaveBeenCalled();
        });
    });
  });
});