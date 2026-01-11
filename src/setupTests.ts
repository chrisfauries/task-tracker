import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.alert since it is not implemented in jsdom
window.alert = vi.fn();

// Mock window.scrollTo if needed
window.scrollTo = vi.fn();