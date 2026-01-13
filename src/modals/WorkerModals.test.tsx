import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import {
  AddWorkerDialog,
  EditWorkerDialog,
  DeleteWorkerDialog,
} from "./WorkerModals";
import { DatabaseService } from "../DatabaseService";
import {
  isAddWorkerDialogOpenAtom,
  isEditWorkerDialogOpenAtom,
  editingWorkerAtom,
  isDeleteWorkerDialogOpenAtom,
  workerToDeleteAtom,
} from "../atoms";

// Mock DatabaseService
vi.mock("../DatabaseService", () => ({
  DatabaseService: {
    createWorker: vi.fn(),
    updateWorker: vi.fn(),
    deleteWorker: vi.fn(),
  },
}));

describe("WorkerModals", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    vi.clearAllMocks();
  });

  describe("AddWorkerDialog", () => {
    const renderDialog = () => {
      return render(
        <Provider store={store}>
          <AddWorkerDialog />
        </Provider>
      );
    };

    it("renders nothing when closed", () => {
      store.set(isAddWorkerDialogOpenAtom, false);
      renderDialog();
      expect(screen.queryByText("Add New Worker")).not.toBeInTheDocument();
    });

    it("renders correctly when open", () => {
      store.set(isAddWorkerDialogOpenAtom, true);
      renderDialog();
      expect(screen.getByText("Add New Worker")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Worker or Student Name")
      ).toBeInTheDocument();
    });

    it("submits a new worker with default color", async () => {
      store.set(isAddWorkerDialogOpenAtom, true);
      renderDialog();

      const input = screen.getByPlaceholderText("Worker or Student Name");
      fireEvent.change(input, { target: { value: "John Doe" } });

      const submitBtn = screen.getByText("Add to Board");
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(DatabaseService.createWorker).toHaveBeenCalledWith(
          "John Doe",
          0 // Expect default color index 0 (Green)
        );
        expect(store.get(isAddWorkerDialogOpenAtom)).toBe(false);
      });
    });

    it("submits a new worker with selected color", async () => {
      store.set(isAddWorkerDialogOpenAtom, true);
      renderDialog();

      fireEvent.change(screen.getByPlaceholderText("Worker or Student Name"), {
        target: { value: "Blue Worker" },
      });

      // Find color buttons. Logic assumes structure: rounded-full buttons.
      // We pick the second one to ensure it's not the default Green.
      const allButtons = screen.getAllByRole("button");
      const colorButtons = allButtons.filter((b) =>
        b.className.includes("rounded-full")
      );
      if (colorButtons[1]) {
        fireEvent.click(colorButtons[1]);
      }

      fireEvent.click(screen.getByText("Add to Board"));

      await waitFor(() => {
        expect(DatabaseService.createWorker).toHaveBeenCalled();
        const args = (DatabaseService.createWorker as any).mock.calls[0];
        expect(args[0]).toBe("Blue Worker");
        expect(args[1]).toBe(1); // Expect index 1 (Blue)
        expect(store.get(isAddWorkerDialogOpenAtom)).toBe(false);
      });
    });

    it("closes when Cancel is clicked", async () => {
      store.set(isAddWorkerDialogOpenAtom, true);
      renderDialog();

      fireEvent.click(screen.getByText("Cancel"));

      await waitFor(() => {
        expect(store.get(isAddWorkerDialogOpenAtom)).toBe(false);
        expect(DatabaseService.createWorker).not.toHaveBeenCalled();
      });
    });
  });

  describe("EditWorkerDialog", () => {
    const mockWorker = { id: "w1", name: "Old Name", color: 1 }; // 1 = Blue

    const renderDialog = () => {
      return render(
        <Provider store={store}>
          <EditWorkerDialog />
        </Provider>
      );
    };

    it("renders nothing when closed", () => {
      store.set(isEditWorkerDialogOpenAtom, false);
      renderDialog();
      expect(screen.queryByText("Edit Worker Name")).not.toBeInTheDocument();
    });

    it("renders nothing when open but no worker selected", () => {
      store.set(isEditWorkerDialogOpenAtom, true);
      store.set(editingWorkerAtom, null);
      renderDialog();
      expect(screen.queryByText("Edit Worker Name")).not.toBeInTheDocument();
    });

    it("pre-fills data and updates worker on save", async () => {
      store.set(isEditWorkerDialogOpenAtom, true);
      store.set(editingWorkerAtom, mockWorker);
      renderDialog();

      const input = screen.getByPlaceholderText(
        "Worker or Student Name"
      ) as HTMLInputElement;
      expect(input.value).toBe("Old Name");

      fireEvent.change(input, { target: { value: "New Name" } });
      fireEvent.click(screen.getByText("Save Changes"));

      await waitFor(() => {
        expect(DatabaseService.updateWorker).toHaveBeenCalledWith("w1", {
          name: "New Name",
          defaultColor: 1, // Expect preserved color 1
        });
        expect(store.get(isEditWorkerDialogOpenAtom)).toBe(false);
        expect(store.get(editingWorkerAtom)).toBe(null);
      });
    });

    it("closes and clears state on Cancel", async () => {
      store.set(isEditWorkerDialogOpenAtom, true);
      store.set(editingWorkerAtom, mockWorker);
      renderDialog();

      fireEvent.click(screen.getByText("Cancel"));

      await waitFor(() => {
        expect(store.get(isEditWorkerDialogOpenAtom)).toBe(false);
        expect(store.get(editingWorkerAtom)).toBe(null);
        expect(DatabaseService.updateWorker).not.toHaveBeenCalled();
      });
    });
  });

  describe("DeleteWorkerDialog", () => {
    const mockWorker = { id: "w99", name: "Delete Me" };

    const renderDialog = () => {
      return render(
        <Provider store={store}>
          <DeleteWorkerDialog />
        </Provider>
      );
    };

    it("renders nothing when closed", () => {
      store.set(isDeleteWorkerDialogOpenAtom, false);
      renderDialog();
      expect(screen.queryByText("Delete Row?")).not.toBeInTheDocument();
    });

    it("displays the correct worker name", () => {
      store.set(isDeleteWorkerDialogOpenAtom, true);
      store.set(workerToDeleteAtom, mockWorker);
      renderDialog();

      expect(screen.getByText("Delete Row?")).toBeInTheDocument();
      expect(screen.getByText("Delete Me")).toBeInTheDocument();
    });

    it("calls deleteWorker and closes on confirm", async () => {
      store.set(isDeleteWorkerDialogOpenAtom, true);
      store.set(workerToDeleteAtom, mockWorker);
      renderDialog();

      fireEvent.click(screen.getByText("Delete Everything"));

      await waitFor(() => {
        expect(DatabaseService.deleteWorker).toHaveBeenCalledWith("w99");
        expect(store.get(isDeleteWorkerDialogOpenAtom)).toBe(false);
        expect(store.get(workerToDeleteAtom)).toBe(null);
      });
    });

    it("closes and keeps row on cancel", async () => {
      store.set(isDeleteWorkerDialogOpenAtom, true);
      store.set(workerToDeleteAtom, mockWorker);
      renderDialog();

      fireEvent.click(screen.getByText("Keep Row"));

      await waitFor(() => {
        expect(store.get(isDeleteWorkerDialogOpenAtom)).toBe(false);
        expect(store.get(workerToDeleteAtom)).toBe(null);
        expect(DatabaseService.deleteWorker).not.toHaveBeenCalled();
      });
    });
  });
});