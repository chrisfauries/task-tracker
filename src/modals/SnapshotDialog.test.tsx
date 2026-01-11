import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SnapshotDialog } from './SnapshotDialog';
import { DatabaseService } from '../DatabaseService';
import * as Jotai from 'jotai';

// ==========================================
// 1. Mocks
// ==========================================

// Mock the Jotai hook to capture the close action
const mockSetIsOpen = vi.fn();
vi.mock('jotai', async (importOriginal) => {
  const actual = await importOriginal<typeof Jotai>();
  return {
    ...actual,
    useSetAtom: () => mockSetIsOpen,
  };
});

// Mock DatabaseService static methods
vi.mock('../DatabaseService', () => {
  return {
    DatabaseService: {
      subscribeToSnapshots: vi.fn(),
      restoreBackup: vi.fn(),
      deleteSnapshot: vi.fn(),
    },
  };
});

// Mock window.alert
const mockAlert = vi.spyOn(window, 'alert').mockImplementation(() => {});
// Mock console.error to suppress expected errors in the console during tests
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

// Sample Data
const mockSnapshots = {
  snap1: {
    title: 'Backup A',
    timestamp: 1672531200000, // 2023-01-01 12:00:00
    createdBy: 'Alice',
    creatorId: 'u1',
    boardData: { worker1: { name: 'Worker 1' } },
    categories: { cat1: { name: 'Category 1', items: [] } },
  },
  snap2: {
    title: 'Backup B',
    timestamp: 1672617600000, // 2023-01-02 12:00:00 (Newer)
    createdBy: 'Bob',
    creatorId: 'u2',
    boardData: {},
    categories: {},
  },
};

describe('SnapshotDialog', () => {
  let subscribeCallback: (data: any) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup the subscribe mock to capture the callback so we can manually trigger data updates
    (DatabaseService.subscribeToSnapshots as Mock).mockImplementation((cb) => {
      subscribeCallback = cb;
      return () => {}; // Return dummy unsubscribe function
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state initially', () => {
    render(<SnapshotDialog />);
    expect(screen.getByText(/loading snapshots/i)).toBeInTheDocument();
  });

  it('renders empty state when no snapshots exist', async () => {
    render(<SnapshotDialog />);
    
    // Wrap state updates in act()
    act(() => {
      subscribeCallback({});
    });
    
    expect(await screen.findByText(/no snapshots available yet/i)).toBeInTheDocument();
  });

  it('renders snapshots list correctly (sorted by newness)', async () => {
    render(<SnapshotDialog />);
    
    act(() => {
      subscribeCallback(mockSnapshots);
    });

    // Wait for the first item to appear
    expect(await screen.findByText('Backup A')).toBeInTheDocument();
    expect(screen.getByText('Backup B')).toBeInTheDocument();

    // Verify order: Backup B (newer) should appear before Backup A
    const titles = screen.getAllByRole('heading', { level: 3 });
    expect(titles[0]).toHaveTextContent('Backup B');
    expect(titles[1]).toHaveTextContent('Backup A');
  });

  it('closes the dialog when the "X" button is clicked', async () => {
    render(<SnapshotDialog />);
    const user = userEvent.setup();

    // Click the top-right X button
    const closeBtn = screen.getByText('✕');
    await user.click(closeBtn);

    expect(mockSetIsOpen).toHaveBeenCalledWith(false);
  });

  describe('Restore Flow', () => {
    it('shows restore confirmation when "Restore" is clicked', async () => {
      render(<SnapshotDialog />);
      act(() => {
        subscribeCallback(mockSnapshots);
      });
      const user = userEvent.setup();

      await screen.findByText('Backup A');

      // Find restore button for first item (Backup B)
      const restoreButtons = screen.getAllByText('Restore', { selector: 'button' });
      await user.click(restoreButtons[0]);

      // Should show confirmation buttons
      expect(screen.getByText('Yes, Restore')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('cancels restore confirmation when "Cancel" is clicked', async () => {
      render(<SnapshotDialog />);
      act(() => {
        subscribeCallback(mockSnapshots);
      });
      const user = userEvent.setup();

      await screen.findByText('Backup A');

      // Click Restore -> Click Cancel
      const restoreBtns = screen.getAllByText('Restore', { selector: 'button' });
      await user.click(restoreBtns[0]);
      await user.click(screen.getByText('Cancel'));

      // Should revert to original state
      expect(screen.queryByText('Yes, Restore')).not.toBeInTheDocument();
    });

    it('calls DatabaseService.restoreBackup and closes on success', async () => {
      render(<SnapshotDialog />);
      act(() => {
        subscribeCallback(mockSnapshots);
      });
      const user = userEvent.setup();

      await screen.findByText('Backup A');

      // Mock success
      (DatabaseService.restoreBackup as Mock).mockResolvedValueOnce(undefined);

      // Trigger Restore
      const restoreBtns = screen.getAllByText('Restore', { selector: 'button' });
      await user.click(restoreBtns[0]); // Select Backup B
      await user.click(screen.getByText('Yes, Restore'));

      // Verify Service Call
      expect(DatabaseService.restoreBackup).toHaveBeenCalledWith(
        mockSnapshots.snap2.boardData,
        mockSnapshots.snap2.categories
      );

      // Verify Success Alert
      expect(mockAlert).toHaveBeenCalledWith('Board restored successfully!');
      
      // Verify Dialog Closed
      expect(mockSetIsOpen).toHaveBeenCalledWith(false);
    });

    it('handles restore errors gracefully', async () => {
      render(<SnapshotDialog />);
      act(() => {
        subscribeCallback(mockSnapshots);
      });
      const user = userEvent.setup();

      await screen.findByText('Backup A');

      // Mock failure
      (DatabaseService.restoreBackup as Mock).mockRejectedValueOnce(new Error('Firebase Error'));

      // Trigger Restore
      const restoreBtns = screen.getAllByText('Restore', { selector: 'button' });
      await user.click(restoreBtns[0]);
      await user.click(screen.getByText('Yes, Restore'));

      // Verify Error Alert
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Error restoring snapshot.');
      });
      
      // Should NOT close dialog on error
      expect(mockSetIsOpen).not.toHaveBeenCalled();
    });
  });

  describe('Delete Flow', () => {
    it('shows delete confirmation when trash icon is clicked', async () => {
      render(<SnapshotDialog />);
      act(() => {
        subscribeCallback(mockSnapshots);
      });
      const user = userEvent.setup();

      await screen.findByText('Backup A');

      // Find Trash icon for first item
      const deleteBtns = screen.getAllByTitle('Delete Snapshot');
      await user.click(deleteBtns[0]);

      // Should show confirmation buttons
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
      expect(screen.getByText('X')).toBeInTheDocument(); // The cancel button for delete
    });

    it('cancels delete confirmation when small "X" is clicked', async () => {
      render(<SnapshotDialog />);
      act(() => {
        subscribeCallback(mockSnapshots);
      });
      const user = userEvent.setup();

      await screen.findByText('Backup A');

      // Trigger Delete -> Cancel
      const deleteBtns = screen.getAllByTitle('Delete Snapshot');
      await user.click(deleteBtns[0]);
      await user.click(screen.getByText('X')); // Cancel delete

      // Should revert to trash icon
      expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
    });

    it('calls DatabaseService.deleteSnapshot on confirm', async () => {
      render(<SnapshotDialog />);
      act(() => {
        subscribeCallback(mockSnapshots);
      });
      const user = userEvent.setup();

      await screen.findByText('Backup A');

      // Mock success
      (DatabaseService.deleteSnapshot as Mock).mockResolvedValueOnce(undefined);

      // Trigger Delete
      const deleteBtns = screen.getAllByTitle('Delete Snapshot');
      // snap2 is first because it's newer, its key is "snap2"
      await user.click(deleteBtns[0]); 
      await user.click(screen.getByText('Confirm Delete'));

      // Verify Service Call
      expect(DatabaseService.deleteSnapshot).toHaveBeenCalledWith('snap2');
      
      // Dialog should remain open, delete confirmation should disappear
      expect(mockSetIsOpen).not.toHaveBeenCalled();
      expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
    });

    it('handles delete errors gracefully', async () => {
      render(<SnapshotDialog />);
      act(() => {
        subscribeCallback(mockSnapshots);
      });
      const user = userEvent.setup();

      await screen.findByText('Backup A');

      // Mock failure
      (DatabaseService.deleteSnapshot as Mock).mockRejectedValueOnce(new Error('Firebase Error'));

      // Trigger Delete
      const deleteBtns = screen.getAllByTitle('Delete Snapshot');
      await user.click(deleteBtns[0]);
      await user.click(screen.getByText('Confirm Delete'));

      // Verify Error Alert
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Error deleting snapshot.');
      });
    });
  });

  it('ensures restore and delete confirmations are mutually exclusive', async () => {
    // This tests that clicking restore on one item resets delete mode on another or itself
    render(<SnapshotDialog />);
    act(() => {
      subscribeCallback(mockSnapshots);
    });
    const user = userEvent.setup();

    await screen.findByText('Backup A');

    // 1. Activate Restore on Item 1
    const restoreBtns = screen.getAllByText('Restore', { selector: 'button' });
    await user.click(restoreBtns[0]);
    expect(screen.getByText('Yes, Restore')).toBeInTheDocument();

    // 2. Activate Delete on Item 1 (should switch mode)
    const deleteBtns = screen.getAllByTitle('Delete Snapshot');
    await user.click(deleteBtns[0]);

    // 3. Verify Switch: Restore options gone, Delete options visible
    expect(screen.queryByText('Yes, Restore')).not.toBeInTheDocument();
    expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
  });
});