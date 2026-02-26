import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { WorkerOrderDialog } from "./WorkerOrderDialog";
import { isDialogOpen, openDialog, Dialog, boardDataAtom } from "../atoms";
import { DatabaseService } from "../DatabaseService";

vi.mock("../DatabaseService", () => ({
  DatabaseService: {
    updateWorkerPositions: vi.fn(),
    subscribeToBoardData: vi.fn(() => () => {}),
  },
}));

describe("WorkerOrderDialog", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    store = createStore();
    store.set(openDialog, Dialog.WORKER_ORDER);
    
    // Setup initial board data
    // Mix of explicit positions and missing positions to verify sorting logic
    store.set(boardDataAtom, {
      "worker-2": { name: "Bob", position: 1000 },
      "worker-3": { name: "Charlie" }, // Should fallback to alphabetical sorting
      "worker-1": { name: "Alice", position: 2000 },
    });
  });

  const renderDialog = () => {
    return render(
      <Provider store={store}>
        <WorkerOrderDialog />
      </Provider>
    );
  };

  it("renders workers in the correct initial order", () => {
    renderDialog();

    // The order should be: Bob (pos: 1000), Alice (pos: 2000), Charlie (pos: MAX, fallback)
    const items = screen.getAllByText(/Alice|Bob|Charlie/);
    expect(items[0]).toHaveTextContent("Bob");
    expect(items[1]).toHaveTextContent("Alice");
    expect(items[2]).toHaveTextContent("Charlie");
  });

  it("calculates and saves worker positions upon saving", async () => {
    renderDialog();

    // Click the save button
    fireEvent.click(screen.getByText("Save Order"));

    // Expected updates: index * 1000 mapping
    await waitFor(() => {
      expect(DatabaseService.updateWorkerPositions).toHaveBeenCalledWith({
        "worker-2": 0,    // Was index 0
        "worker-1": 1000, // Was index 1
        "worker-3": 2000, // Was index 2
      });
    });

    // Validates the modal automatically closes upon success
    expect(store.get(isDialogOpen(Dialog.WORKER_ORDER))).toBe(false);
  });

  it("cancels properly without saving", () => {
    renderDialog();

    fireEvent.click(screen.getByText("Cancel"));

    expect(DatabaseService.updateWorkerPositions).not.toHaveBeenCalled();
    expect(store.get(isDialogOpen(Dialog.WORKER_ORDER))).toBe(false);
  });
});