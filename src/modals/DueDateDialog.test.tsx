import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DueDateDialog } from "./DueDateDialog";
import { DatabaseService } from "../DatabaseService";
import { Provider, createStore } from "jotai";
import { isDueDateDialogOpenAtom, addToCategoryTargetAtom } from "../atoms";
import type { AddToCategoryTarget } from "../types";

// Mock DatabaseService
vi.mock("../DatabaseService", () => ({
  DatabaseService: {
    updateNoteDueDate: vi.fn(),
  },
}));

describe("DueDateDialog", () => {
  const mockTarget: AddToCategoryTarget = {
    id: "note-123",
    workerId: "worker-abc",
    text: "Test Note",
    dueDate: undefined,
  };

  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    store.set(isDueDateDialogOpenAtom, true);
    store.set(addToCategoryTargetAtom, mockTarget);

    vi.clearAllMocks();
    
    // FIX: Only mock 'Date' so setTimeout/setInterval (used by waitFor) still work
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date("2025-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderDialog = () => {
    return render(
      <Provider store={store}>
        <DueDateDialog />
      </Provider>
    );
  };

  it("renders nothing when closed", () => {
    store.set(isDueDateDialogOpenAtom, false);
    renderDialog();
    expect(screen.queryByText("Set Due Date")).not.toBeInTheDocument();
  });

  it("renders correctly when open (defaults to today)", () => {
    renderDialog();

    // Should show title
    expect(screen.getByText("Set Due Date")).toBeInTheDocument();
    
    // Should show current month (Locked to Jan 2025)
    expect(screen.getByText("January 2025")).toBeInTheDocument();
    
    // Should show days (e.g., 15 is today)
    const day15 = screen.getByRole("button", { name: "15" });
    expect(day15).toBeInTheDocument();
  });

  it("initializes with the existing due date selected", () => {
    store.set(addToCategoryTargetAtom, { ...mockTarget, dueDate: "2025-02-20" });
    renderDialog();

    // Should auto-navigate to February
    expect(screen.getByText("February 2025")).toBeInTheDocument();

    // Day 20 should be visually selected (checking for standard selected class bg-indigo-600)
    const day20 = screen.getByRole("button", { name: "20" });
    expect(day20).toHaveClass("bg-indigo-600");
  });

  it("navigates between months", () => {
    renderDialog();

    // Start at Jan 2025
    expect(screen.getByText("January 2025")).toBeInTheDocument();

    // Click Next -> Feb 2025
    fireEvent.click(screen.getByText("▶"));
    expect(screen.getByText("February 2025")).toBeInTheDocument();

    // Click Prev -> Jan 2025
    fireEvent.click(screen.getByText("◀"));
    expect(screen.getByText("January 2025")).toBeInTheDocument();
    
    // Click Prev -> Dec 2024
    fireEvent.click(screen.getByText("◀"));
    expect(screen.getByText("December 2024")).toBeInTheDocument();
  });

  it("selects a date when a day is clicked", () => {
    renderDialog();

    // Click on day 10
    const day10 = screen.getByRole("button", { name: "10" });
    
    // Initially not selected
    expect(day10).not.toHaveClass("bg-indigo-600");

    fireEvent.click(day10);

    // Now selected
    expect(day10).toHaveClass("bg-indigo-600");
  });

  it("saves the selected date to DatabaseService", async () => {
    renderDialog();

    // Select Jan 10th
    const day10 = screen.getByRole("button", { name: "10" });
    fireEvent.click(day10);

    // Click Set Date
    fireEvent.click(screen.getByText("Set Date"));

    // Verify DB call
    expect(DatabaseService.updateNoteDueDate).toHaveBeenCalledTimes(1);
    expect(DatabaseService.updateNoteDueDate).toHaveBeenCalledWith(
      "worker-abc",
      "note-123",
      "2025-01-10" // YYYY-MM-DD format
    );

    // Verify dialog closed in store
    await waitFor(() => {
      expect(store.get(isDueDateDialogOpenAtom)).toBe(false);
    });
  });

  it("clears the date when Clear is clicked", async () => {
    store.set(addToCategoryTargetAtom, { ...mockTarget, dueDate: "2025-02-20" });
    renderDialog();

    fireEvent.click(screen.getByText("Clear"));

    expect(DatabaseService.updateNoteDueDate).toHaveBeenCalledWith(
      "worker-abc",
      "note-123",
      null
    );

    await waitFor(() => {
      expect(store.get(isDueDateDialogOpenAtom)).toBe(false);
    });
  });

  it("closes without saving when X is clicked", () => {
    renderDialog();

    fireEvent.click(screen.getByText("✕"));

    expect(DatabaseService.updateNoteDueDate).not.toHaveBeenCalled();
    expect(store.get(isDueDateDialogOpenAtom)).toBe(false);
  });

  it("handles 'Set Date' with no selection (implicitly setting null)", async () => {
    renderDialog();

    // Ensure nothing is selected by default for a new note
    // Click Set Date immediately
    fireEvent.click(screen.getByText("Set Date"));

    // Based on implementation, this usually sends null
    expect(DatabaseService.updateNoteDueDate).toHaveBeenCalledWith(
      "worker-abc",
      "note-123",
      null 
    );
    
    await waitFor(() => {
      expect(store.get(isDueDateDialogOpenAtom)).toBe(false);
    });
  });
});