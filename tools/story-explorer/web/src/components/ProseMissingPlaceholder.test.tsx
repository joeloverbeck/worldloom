import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProseMissingPlaceholder } from './ProseMissingPlaceholder';

describe('ProseMissingPlaceholder', () => {
  it('renders the missing prose copy and disabled x-ray target', () => {
    render(<ProseMissingPlaceholder status="missing" />);

    expect(screen.getByText('Rendered prose not attached yet.')).toBeInTheDocument();
    expect(screen.getByText("This page's state, choices, event delta, and records are available below.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View page plan in State X-Ray' })).toBeDisabled();
  });

  it('renders the unreadable prose copy', () => {
    render(<ProseMissingPlaceholder status="unreadable" />);

    expect(screen.getByText('Prose file present but unreadable.')).toBeInTheDocument();
    expect(screen.getByText('See Validation & Integrity in State X-Ray.')).toBeInTheDocument();
  });

  it('renders the hash mismatch copy', () => {
    render(<ProseMissingPlaceholder status="hash_mismatch" />);

    expect(screen.getByText('Prose receipt indicates hash mismatch.')).toBeInTheDocument();
    expect(screen.getByText('See Validation & Integrity.')).toBeInTheDocument();
  });
});
