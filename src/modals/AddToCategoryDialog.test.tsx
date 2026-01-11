import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddToCategoryDialog } from './AddToCategoryDialog';
import { DatabaseService } from '../DatabaseService';
import type { CategoriesData } from '../types';

vi.mock('../DatabaseService', () => ({
  DatabaseService: {
    createCategory: vi.fn(),
  },
}));

describe('AddToCategoryDialog', () => {
  const mockCategories: CategoriesData = {
    'cat1': { name: 'Work', items: ['Task 1'], color: 'Blue' },
    'cat2': { name: 'Personal', items: [], color: 'Green' },
  };
  const mockOnClose = vi.fn();
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with categories', () => {
    render(
      <AddToCategoryDialog
        categories={mockCategories}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('Personal')).toBeInTheDocument();
    expect(screen.queryByText(/No categories/i)).not.toBeInTheDocument();
  });

  it('renders correctly without categories', () => {
    render(
      <AddToCategoryDialog
        categories={{}}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );
    expect(screen.getByText(/No categories available/i)).toBeInTheDocument();
  });

  it('auto-focuses the new category input on mount', () => {
    render(
      <AddToCategoryDialog
        categories={mockCategories}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );
    const input = screen.getByPlaceholderText('Category Name');
    expect(input).toHaveFocus();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <AddToCategoryDialog
        categories={mockCategories}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );
    fireEvent.click(screen.getByText('✕'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onSelect when an existing category is clicked', () => {
    render(
      <AddToCategoryDialog
        categories={mockCategories}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );
    fireEvent.click(screen.getByText('Work'));
    expect(mockOnSelect).toHaveBeenCalledWith('cat1');
  });

  it('updates input value and button state', () => {
    render(
      <AddToCategoryDialog
        categories={mockCategories}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );
    const input = screen.getByPlaceholderText('Category Name');
    const button = screen.getByText('Create and Add');

    // Initially disabled
    expect(button).toBeDisabled();

    // Type text
    fireEvent.change(input, { target: { value: 'New Cat' } });
    expect(input).toHaveValue('New Cat');
    expect(button).not.toBeDisabled();
  });

  it('creates category on button click and waits for prop propagation', async () => {
    const newId = 'cat_new';
    (DatabaseService.createCategory as any).mockResolvedValue(newId);

    const { rerender } = render(
      <AddToCategoryDialog
        categories={mockCategories}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );

    const input = screen.getByPlaceholderText('Category Name');
    fireEvent.change(input, { target: { value: 'Urgent' } });
    
    const createBtn = screen.getByText('Create and Add');
    fireEvent.click(createBtn);

    expect(DatabaseService.createCategory).toHaveBeenCalledWith('Urgent');
    expect(createBtn).toHaveTextContent('Creating...');
    expect(createBtn).toBeDisabled();

    // Verify onSelect is NOT called immediately (waiting for props)
    expect(mockOnSelect).not.toHaveBeenCalled();

    // Simulate prop update from parent
    const updatedCategories = {
      ...mockCategories,
      [newId]: { name: 'Urgent', items: [], color: 'Green' }
    };

    rerender(
      <AddToCategoryDialog
        categories={updatedCategories}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );

    // Now it should trigger selection
    await waitFor(() => {
      expect(mockOnSelect).toHaveBeenCalledWith(newId);
    });
  });

  it('creates category on Enter key press', async () => {
    const newId = 'cat_enter';
    (DatabaseService.createCategory as any).mockResolvedValue(newId);

    render(
      <AddToCategoryDialog
        categories={mockCategories}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );

    const input = screen.getByPlaceholderText('Category Name');
    fireEvent.change(input, { target: { value: 'Enter Cat' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    expect(DatabaseService.createCategory).toHaveBeenCalledWith('Enter Cat');
  });

  it('does not create category on Enter if input is empty', () => {
    render(
      <AddToCategoryDialog
        categories={mockCategories}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );

    const input = screen.getByPlaceholderText('Category Name');
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    expect(DatabaseService.createCategory).not.toHaveBeenCalled();
  });

  it('handles creation errors gracefully', async () => {
     (DatabaseService.createCategory as any).mockRejectedValue(new Error('Network Error'));
     
     render(
      <AddToCategoryDialog
        categories={mockCategories}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );
    
    const input = screen.getByPlaceholderText('Category Name');
    fireEvent.change(input, { target: { value: 'Fail Cat' } });
    fireEvent.click(screen.getByText('Create and Add'));
    
    // Should eventually reset to "Create and Add" and be enabled
    await waitFor(() => {
       expect(screen.getByText('Create and Add')).toBeInTheDocument();
       expect(screen.getByText('Create and Add')).not.toBeDisabled();
    });
  });
});