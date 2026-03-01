import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { AppSettingsMenu } from "./AppSettingsMenu";
import {
  appSettingsMenuPosAtom,
  openDialog,
  Dialog,
  darkModeAtom,
  logoutAtom,
  isDialogOpen,
} from "./atoms";
import { signOut } from "firebase/auth";

// Mocking Firebase as seen in other tests to prevent initialization errors
vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(),
  onAuthStateChanged: vi.fn(() => () => {}),
  GoogleAuthProvider: vi.fn(),
  signOut: vi.fn(),
}));

describe("AppSettingsMenu Component", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    // Initialize required atoms
    store.set(appSettingsMenuPosAtom, { x: 100, y: 100 });
    store.set(darkModeAtom, false);
    
    // Clear any previous calls to the openDialog atom if it's being tracked
    // Note: Since openDialog is a write-only atom in the component, 
    // we check the resulting side effects in the store.
  });

  const renderComponent = () => {
    return render(
      <Provider store={store}>
        <AppSettingsMenu />
      </Provider>
    );
  };

  it("returns null and does not render when position is null", () => {
    store.set(appSettingsMenuPosAtom, null);
    const { container } = renderComponent();
    expect(container.firstChild).toBeNull();
  });

  it("renders the menu when a position is provided", () => {
    renderComponent();
    expect(screen.getByText("Manage Categories")).toBeInTheDocument();
    expect(screen.getByText("Logout")).toBeInTheDocument();
  });

  it("closes the menu when the backdrop is clicked", () => {
    const { container } = renderComponent();
    
    // The first div in the fragment is the backdrop
    const backdrop = container.firstElementChild;
    if (backdrop) fireEvent.click(backdrop);

    expect(store.get(appSettingsMenuPosAtom)).toBeNull();
  });

  describe("Dark Mode Toggle", () => {
    it("toggles the dark mode atom when the switch is clicked", () => {
      renderComponent();
      const checkbox = screen.getByLabelText("Toggle Dark Mode");

      // Toggle ON
      fireEvent.click(checkbox);
      expect(store.get(darkModeAtom)).toBe(true);
      expect(screen.getByText("Light Mode")).toBeInTheDocument();

      // Toggle OFF
      fireEvent.click(checkbox);
      expect(store.get(darkModeAtom)).toBe(false);
      expect(screen.getByText("Dark Mode")).toBeInTheDocument();
    });
  });

  describe("Menu Actions", () => {
    const actionTests = [
      { text: "Manage Categories", expectedDialog: Dialog.CATEGORY_MANAGEMENT },
      { text: "Manage Workers", expectedDialog: Dialog.WORKER_ORDER },
      { text: "Customize Colors", expectedDialog: Dialog.CUSTOM_COLORS },
      { text: "Snapshots", expectedDialog: Dialog.SNAPSHOT },
      { text: "Import/Export", expectedDialog: Dialog.IMPORT_EXPORT },
    ];

    actionTests.forEach(({ text, expectedDialog }) => {
      it(`opens ${expectedDialog} and closes menu when '${text}' is clicked`, () => {
        renderComponent();
        
        fireEvent.click(screen.getByText(text));

        // Check if the dialog was opened (assuming openDialog updates an internal state)
        // In Jotai, we'd check the state affected by the openDialog atom
        expect(store.get(isDialogOpen(expectedDialog))).toBe(true);
        
        // Menu should close
        expect(store.get(appSettingsMenuPosAtom)).toBeNull();
      });
    });

    it("triggers logout and closes menu when Logout is clicked", () => {
      renderComponent();
      fireEvent.click(screen.getByText("Logout"));

      expect(signOut).toHaveBeenCalled();
      expect(store.get(appSettingsMenuPosAtom)).toBeNull();
    });
  });
});
