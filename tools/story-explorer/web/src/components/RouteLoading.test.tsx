import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RouteLoading } from './RouteLoading';

describe('RouteLoading', () => {
  it('renders the provided route context label', () => {
    render(<RouteLoading label="Loading worlds..." />);

    expect(screen.getByRole('status', { name: 'Loading worlds...' })).toBeInTheDocument();
    expect(screen.getByText('Loading worlds...')).toBeInTheDocument();
  });

  it('uses a non-empty default label', () => {
    render(<RouteLoading />);

    expect(screen.getByRole('status', { name: 'Loading...' })).toBeInTheDocument();
  });
});
