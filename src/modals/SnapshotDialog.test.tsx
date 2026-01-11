import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { SnapshotDialog } from "./SnapshotDialog";
import { DatabaseService } from "../DatabaseService";
import { Provider, createStore } from "jotai";
import {
  isSnapshotDialogOpenAtom,
  snapshotsAtom,
  snapshotsLoadingAtom,
} from "../atoms";
import type { SnapshotsData } from "../types";

// Mock DatabaseService
vi.mock("../DatabaseService", () => ({
  DatabaseService: {
    restoreBackup: vi.fn(),
    deleteSnapshot: vi.fn(),
    subscribeToSnapshots: vi.fn(() => () => {}),
  },
}));

// Mock alert and console
const mockAlert = vi.spyOn(window, "alert").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

describe("SnapshotDialog", () => {
  const mockSnapshots: SnapshotsData = {
    snap1: {
      title: "Backup A",
      timestamp: 1000,
      boardData: {},
      categories: {},
      createdBy: "User A",
      creatorId: "u1",
    },
    snap2: {
      title: "Backup B",
      timestamp: 2000,
      boardData: {},
      categories: {},
      createdBy: "User B",
      creatorId: "u2",
    },
  };

  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    store = createStore();
    // Default: Open, Loaded, Data present
    store.set(isSnapshotDialogOpenAtom, true);
    store.set(snapshotsLoadingAtom, false);
    store.set(snapshotsAtom, mockSnapshots);
  });

  const renderDialog = () => {
    return render(
      <Provider store={store}>
        <SnapshotDialog />
      </Provider>
    );
  };

  it("renders nothing when closed", () => {
    store.set(isSnapshotDialogOpenAtom, false);
    renderDialog();
    expect(screen.queryByText("Version History")).not.toBeInTheDocument();
  });

  it("renders loading state", () => {
    store.set(snapshotsAtom, {});
    store.set(snapshotsLoadingAtom, true);

    renderDialog();
    expect(screen.getByText("Loading snapshots...")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    store.set(snapshotsAtom, {});
    renderDialog();
    expect(screen.getByText("No snapshots available yet.")).toBeInTheDocument();
  });

  it("renders snapshots list sorted by timestamp descending", () => {
    renderDialog();

    const titles = screen
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.textContent);
    // snap2 (timestamp 2000) should come before snap1 (timestamp 1000)
    expect(titles).toEqual(["Backup B", "Backup A"]);

    expect(screen.getByText(/by User A/)).toBeInTheDocument();
    expect(screen.getByText(/by User B/)).toBeInTheDocument();
  });

  it("closes when close button is clicked", async () => {
    renderDialog();
    fireEvent.click(screen.getByText("✕"));

    await waitFor(() => {
      expect(store.get(isSnapshotDialogOpenAtom)).toBe(false);
    });
  });

  describe("Restore Flow", () => {
    it("shows confirmation and restores on yes", async () => {
      renderDialog();

      // Click first Restore button (for Backup B)
      const restoreButtons = screen.getAllByText("Restore", {
        selector: "button",
      });
      fireEvent.click(restoreButtons[0]);

      expect(screen.getByText("Yes, Restore")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();

      // Click Confirm
      fireEvent.click(screen.getByText("Yes, Restore"));

      await waitFor(() => {
        expect(DatabaseService.restoreBackup).toHaveBeenCalledWith({}, {});
        expect(mockAlert).toHaveBeenCalledWith("Board restored successfully!");
        expect(store.get(isSnapshotDialogOpenAtom)).toBe(false);
      });
    });

    it("cancels restore confirmation", async () => {
      renderDialog();
      const restoreButtons = screen.getAllByText("Restore", {
        selector: "button",
      });
      fireEvent.click(restoreButtons[0]);

      fireEvent.click(screen.getByText("Cancel"));

      expect(screen.queryByText("Yes, Restore")).not.toBeInTheDocument();
      expect(screen.getAllByText("Restore").length).toBeGreaterThan(0);
    });
  });

  describe("Delete Flow", () => {
    it("shows confirmation and deletes on yes", async () => {
      renderDialog();

      const deleteButtons = screen.getAllByTitle("Delete Snapshot");
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByText("Confirm Delete")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Confirm Delete"));

      await waitFor(() => {
        // snap2 is the first item due to sorting
        expect(DatabaseService.deleteSnapshot).toHaveBeenCalledWith("snap2");
      });
    });

    it("cancels delete confirmation", async () => {
      renderDialog();

      const deleteButtons = screen.getAllByTitle("Delete Snapshot");
      fireEvent.click(deleteButtons[0]);

      // Cancel button is labeled 'X' in the delete confirmation block
      const cancelButtons = screen.getAllByText("X", { selector: "button" });
      fireEvent.click(cancelButtons[0]);

      expect(screen.queryByText("Confirm Delete")).not.toBeInTheDocument();
    });
  });

  it("ensures restore and delete confirmations are mutually exclusive", async () => {
    renderDialog();

    // 1. Activate Restore on Item 1
    const restoreButtons = screen.getAllByText("Restore", {
      selector: "button",
    });
    fireEvent.click(restoreButtons[0]);
    expect(screen.getByText("Yes, Restore")).toBeInTheDocument();

    // 2. Activate Delete on Item 1 (should switch mode)
    const deleteButtons = screen.getAllByTitle("Delete Snapshot");
    fireEvent.click(deleteButtons[0]);

    // 3. Verify Switch: Restore options gone, Delete options visible
    expect(screen.queryByText("Yes, Restore")).not.toBeInTheDocument();
    expect(screen.getByText("Confirm Delete")).toBeInTheDocument();

    // 4. Activate Restore on Item 2 (should reset Item 1)
    if (restoreButtons[1]) {
      fireEvent.click(restoreButtons[1]);
      expect(screen.queryByText("Confirm Delete")).not.toBeInTheDocument();
      // "Yes, Restore" should appear for the second item
      expect(screen.getByText("Yes, Restore")).toBeInTheDocument();
    }
  });
});
