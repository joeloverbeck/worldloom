import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { NotFoundPage } from './NotFoundPage';

describe('NotFoundPage', () => {
  it('links resource misses back to the story dashboard root when story params are available', () => {
    render(
      <MemoryRouter>
        <NotFoundPage worldSlug="fixture world" storySlug="red bunny" />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Resource not found.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to story root' })).toHaveAttribute(
      'href',
      '/worlds/fixture%20world/stories/red%20bunny',
    );
  });

  it('falls back to the world picker when story params are unavailable', () => {
    render(
      <MemoryRouter>
        <NotFoundPage resourceLabel="world" />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'World not found.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to worlds' })).toHaveAttribute('href', '/');
  });
});
