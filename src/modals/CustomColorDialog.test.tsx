import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { CustomColorsDialog } from "./CustomColorDialog";
import { DatabaseService } from "../DatabaseService";
import { isCustomColorsDialogOpenAtom, customPaletteAtom } from "../atoms";

// Mock DatabaseService
vi.mock("../DatabaseService", () => ({
  DatabaseService: {
    saveCustomPalette: vi.fn(),
    subscribeToCategories: vi.fn(() => () => {}),
    subscribeToSnapshots: vi.fn(() => () => {}),
    subscribeToCustomPalette: vi.fn(() => () => {}),
  },
}));

describe("CustomColorsDialog", () => {
  let store: ReturnType<typeof createStore>;
  const DEFAULT_PALETTE = [
    "#10B981", "#3B82F6", "#EAB308", "#EF4444", "#F97316", "#A855F7", "#EC4899"
  ];

  beforeEach(() => {
    store = createStore();
    store.set(isCustomColorsDialogOpenAtom, true);
    store.set(customPaletteAtom, DEFAULT_PALETTE);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderDialog = () => {
    return render(
      <Provider store={store}>
        <CustomColorsDialog />
      </Provider>
    );
  };

  it("renders nothing when closed", () => {
    store.set(isCustomColorsDialogOpenAtom, false);
    renderDialog();
    expect(screen.queryByText("Customize Color Palette")).not.toBeInTheDocument();
  });

  it("renders correctly when open", () => {
    renderDialog();
    expect(screen.getByText("Customize Color Palette")).toBeInTheDocument();
    expect(screen.getByText("Color Slots")).toBeInTheDocument();
    expect(screen.getByText("Save Palette")).toBeInTheDocument();
  });

  it("closes when the close button is clicked", async () => {
    renderDialog();
    // There are two close buttons: one X and one 'Cancel'
    const closeBtn = screen.getByText("✕");
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(store.get(isCustomColorsDialogOpenAtom)).toBe(false);
    });
  });

  it("closes when the Cancel button is clicked", async () => {
    renderDialog();
    const cancelBtn = screen.getByText("Cancel");
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(store.get(isCustomColorsDialogOpenAtom)).toBe(false);
    });
  });

  it("allows selecting a slot and changing its color", async () => {
    const { container } = renderDialog();
    
    // Select the first slot (default) and verify header
    expect(screen.getByText("Edit One")).toBeInTheDocument();

    // Change the hex input
    const hexInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(hexInput, { target: { value: "#123456" } });

    // Verify state update in UI
    expect(hexInput.value).toBe("#123456");
    
    // Select second slot
    const slotTwoBtn = screen.getByText("Two").closest("button");
    fireEvent.click(slotTwoBtn!);
    
    expect(screen.getByText("Edit Two")).toBeInTheDocument();
    // Verify input updated to slot 2's default color (Blue: #3B82F6)
    expect(hexInput.value).toBe("#3B82F6");
  });

  it("resets colors to default when 'Reset Defaults' is clicked", async () => {
    const { container } = renderDialog();
    const hexInput = container.querySelector('input[type="text"]') as HTMLInputElement;

    // Change first color
    fireEvent.change(hexInput, { target: { value: "#000000" } });
    expect(hexInput.value).toBe("#000000");

    // Click Reset
    const resetBtn = screen.getByText("Reset Defaults");
    fireEvent.click(resetBtn);

    // Verify reset
    expect(hexInput.value).toBe("#10B981"); // Default green
  });

  it("saves the palette and closes the dialog", async () => {
    const { container } = renderDialog();
    const hexInput = container.querySelector('input[type="text"]') as HTMLInputElement;

    // Change first color
    const newColor = "#ABCDEF";
    fireEvent.change(hexInput, { target: { value: newColor } });

    // Click Save
    const saveBtn = screen.getByText("Save Palette");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(DatabaseService.saveCustomPalette).toHaveBeenCalledWith(
        expect.arrayContaining([newColor])
      );
      // Should also verify other defaults are present
      expect(DatabaseService.saveCustomPalette).toHaveBeenCalledWith(
        expect.arrayContaining(["#3B82F6", "#EAB308"])
      );
      expect(store.get(isCustomColorsDialogOpenAtom)).toBe(false);
    });
  });
});