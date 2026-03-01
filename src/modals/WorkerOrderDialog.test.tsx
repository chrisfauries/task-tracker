import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { WorkerOrderDialog } from "./WorkerOrderDialog";
import {
  openDialog,
  Dialog,
  boardDataAtom,
  workerOrderModeAtom,
  personalWorkerPositionsAtom,
} from "../atoms";
import { DatabaseService } from "../DatabaseService";

vi.mock("../DatabaseService", () => ({
  DatabaseService: {
    updateWorkerPositions: vi.fn(),
    updatePersonalWorkerPositions: vi.fn(),
    updateWorker: vi.fn(),
    deleteWorker: vi.fn(),
    createWorker: vi.fn(),
    subscribeToBoardData: vi.fn(() => () => {}),
  },
}));

vi.mock("../atoms", async (importOriginal) => {
  const actual = await importOriginal<any>();
  const { atom } = await import("jotai");
  return {
    ...actual,
    userAtom: atom({
      uid: "test-user",
      displayName: "Test User",
      email: "test@example.com",
      photoURL: null,
    }),
  };
});

describe("WorkerOrderDialog", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    store = createStore();
    store.set(openDialog, Dialog.WORKER_ORDER);

    // Setup initial board data
    store.set(boardDataAtom, {
      "worker-2": { name: "Bob", position: 1000, defaultColor: 0, notes: {} },
      "worker-3": {
        name: "Charlie",
        position: 3000,
        defaultColor: 1,
        notes: {},
      },
      "worker-1": { name: "Alice", position: 2000, defaultColor: 2, notes: {} },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderDialog = () => {
    return render(
      <Provider store={store}>
        <WorkerOrderDialog />
      </Provider>,
    );
  };

  it("renders workers in the correct initial order", () => {
    renderDialog();

    // Order: Bob (1000), Alice (2000), Charlie (3000)
    const items = screen.getAllByText(/Alice|Bob|Charlie/);
    expect(items[0]).toHaveTextContent("Bob");
    expect(items[1]).toHaveTextContent("Alice");
    expect(items[2]).toHaveTextContent("Charlie");
  });

  it("adds a new worker", async () => {
    (DatabaseService.createWorker as any).mockResolvedValue("new-worker-id");
    renderDialog();

    // Click Add Worker button
    fireEvent.click(screen.getByText("Add Worker"));

    // Fill input
    const input = screen.getByPlaceholderText("New Worker Name");
    fireEvent.change(input, { target: { value: "David" } });

    // Click confirm
    fireEvent.click(screen.getByTitle("Confirm Add"));

    await waitFor(() => {
      expect(DatabaseService.createWorker).toHaveBeenCalledWith("David", 0);
      // Should also update positions to include new worker at end
      expect(DatabaseService.updateWorkerPositions).toHaveBeenCalledWith({
        "new-worker-id": 4000, // Max pos (3000) + 1000
      });
    });
  });

  it("edits an existing worker", async () => {
    renderDialog();

    // Find Alice's row
    const aliceRow = screen
      .getByText("Alice")
      .closest("div[draggable]") as HTMLElement;

    // Click edit button (pencil)
    const editBtn = within(aliceRow).getByTitle("Edit");
    fireEvent.click(editBtn);

    // Input should appear with current name
    const input = screen.getByDisplayValue("Alice");
    fireEvent.change(input, { target: { value: "Alice Cooper" } });

    // Change color (click second color circle, index 1)
    const editContainer = input.closest("div.p-3") as HTMLElement;
    const colorButtons = within(editContainer).getAllByRole("button");
    // The first few buttons are colors.
    // We want index 1 (second color).
    fireEvent.click(colorButtons[1]);

    // Click save (check mark)
    const saveBtn = within(editContainer).getByText("✓");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(DatabaseService.updateWorker).toHaveBeenCalledWith("worker-1", {
        name: "Alice Cooper",
        defaultColor: 1,
      });
    });
  });

  it("deletes a worker", async () => {
    renderDialog();

    const bobRow = screen
      .getByText("Bob")
      .closest("div[draggable]") as HTMLElement;
    const deleteBtn = within(bobRow).getByTitle("Delete");
    fireEvent.click(deleteBtn);

    // Confirmation should appear
    expect(screen.getByText("Delete Bob?")).toBeInTheDocument();

    // Click Yes
    fireEvent.click(screen.getByText("Yes"));

    await waitFor(() => {
      expect(DatabaseService.deleteWorker).toHaveBeenCalledWith("worker-2");
    });
  });

  it("reorders workers via drag and drop (Global Mode)", async () => {
    renderDialog();

    const rows = screen
      .getAllByText(/Alice|Bob|Charlie/)
      .map((el) => el.closest("div[draggable]") as HTMLElement);

    // Mock geometry
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        const index = rows.indexOf(this);
        if (index !== -1) {
          return {
            top: index * 50,
            height: 50,
            bottom: (index + 1) * 50,
            left: 0,
            right: 100,
            width: 100,
            x: 0,
            y: index * 50,
            toJSON: () => {},
          } as DOMRect;
        }
        // Fallback for container
        return {
          top: 0,
          height: 150,
          bottom: 150,
          left: 0,
          right: 100,
          width: 100,
          x: 0,
          y: 0,
          toJSON: () => {},
        } as DOMRect;
      },
    );

    rows.forEach((row, index) => {
      Object.defineProperty(row, "offsetTop", {
        configurable: true,
        value: index * 50,
      });
      Object.defineProperty(row, "offsetHeight", {
        configurable: true,
        value: 50,
      });
    });

    const listContainer = rows[0].parentElement as HTMLElement;

    // Drag Bob (index 0) to below Charlie (index 2)
    fireEvent.dragStart(rows[0]);
    fireEvent.dragOver(listContainer, { clientY: 125 }); // 125 is > 100 (Charlie top) + 25 (half height)
    fireEvent.drop(listContainer);

    await waitFor(() => {
      // Bob moves to end.
      // New Order: Alice, Charlie, Bob
      expect(DatabaseService.updateWorkerPositions).toHaveBeenCalledWith({
        "worker-1": 1000,
        "worker-3": 2000,
        "worker-2": 3000,
      });
    });
  });

  it("reorders workers via drag and drop (Personal Mode)", async () => {
    renderDialog();

    // Switch to Personal mode
    fireEvent.click(screen.getByText("Personal"));

    // Set initial personal order to be different from global
    // Charlie (1), Bob (2), Alice (3)
    store.set(personalWorkerPositionsAtom, {
      "worker-3": 1000,
      "worker-2": 2000,
      "worker-1": 3000,
    });
    
    // Let React re-render with the new order
    await waitFor(() => {
      const items = screen.getAllByText(/Alice|Bob|Charlie/);
      expect(items[0]).toHaveTextContent("Charlie");
      expect(items[1]).toHaveTextContent("Bob");
      expect(items[2]).toHaveTextContent("Alice");
    });

    const rows = screen
      .getAllByText(/Alice|Bob|Charlie/)
      .map((el) => el.closest("div[draggable]") as HTMLElement);

    // Mock geometry
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        const index = rows.indexOf(this);
        if (index !== -1) {
          return {
            top: index * 50,
            height: 50,
            bottom: (index + 1) * 50,
            left: 0,
            right: 100,
            width: 100,
            x: 0,
            y: index * 50,
            toJSON: () => {},
          } as DOMRect;
        }
        // Fallback for container
        return {
          top: 0,
          height: 150,
          bottom: 150,
          left: 0,
          right: 100,
          width: 100,
          x: 0,
          y: 0,
          toJSON: () => {},
        } as DOMRect;
      },
    );

    rows.forEach((row, index) => {
      Object.defineProperty(row, "offsetTop", {
        configurable: true,
        value: index * 50,
      });
      Object.defineProperty(row, "offsetHeight", {
        configurable: true,
        value: 50,
      });
    });

    const listContainer = rows[0].parentElement as HTMLElement;

    // Drag Charlie (index 0) to below Alice (index 2)
    fireEvent.dragStart(rows[0]);
    fireEvent.dragOver(listContainer, { clientY: 125 });
    fireEvent.drop(listContainer);

    await waitFor(() => {
      // Charlie moves to end.
      // New Order: Bob, Alice, Charlie
      expect(
        DatabaseService.updatePersonalWorkerPositions,
      ).toHaveBeenCalledWith("test-user", {
        "worker-2": 1000,
        "worker-1": 2000,
        "worker-3": 3000,
      });

      expect(DatabaseService.updateWorkerPositions).not.toHaveBeenCalled();
    });
  });

  it("switches to Personal mode and updates personal positions", async () => {
    renderDialog();

    // Switch to Personal
    fireEvent.click(screen.getByText("Personal"));

    expect(store.get(workerOrderModeAtom)).toBe("personal");

    // Seed personal positions so they aren't MAX_SAFE_INTEGER
    store.set(personalWorkerPositionsAtom, {
      "worker-2": 1000,
      "worker-1": 2000,
      "worker-3": 3000,
    });

    // Add a worker in personal mode
    (DatabaseService.createWorker as any).mockResolvedValue("personal-worker");
    fireEvent.click(screen.getByText("Add Worker"));
    const input = screen.getByPlaceholderText("New Worker Name");
    fireEvent.change(input, { target: { value: "Personal One" } });
    fireEvent.click(screen.getByTitle("Confirm Add"));

    await waitFor(() => {
      expect(
        DatabaseService.updatePersonalWorkerPositions,
      ).toHaveBeenCalledWith("test-user", { "personal-worker": 4000 });
    });
  });
});
