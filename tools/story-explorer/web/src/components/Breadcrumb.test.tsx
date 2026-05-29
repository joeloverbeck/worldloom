import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { Breadcrumb } from './Breadcrumb';

describe('Breadcrumb', () => {
  it('renders the worlds, world, story-dashboard, and trailing scene hierarchy', () => {
    render(
      <MemoryRouter>
        <Breadcrumb
          worldSlug="fixture-world"
          worldDisplayName="Fixture World"
          storySlug="red-bunny"
          storyTitle="Red Bunny"
          trail={[
            { label: 'Scenes', href: '/worlds/fixture-world/stories/red-bunny/scenes' },
            { label: 'Scene SCN-3', href: '/worlds/fixture-world/stories/red-bunny/scenes/SCN-3' },
          ]}
        />
      </MemoryRouter>,
    );

    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    const list = within(nav).getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(5);
    expect(within(nav).getByRole('link', { name: 'Worlds' })).toHaveAttribute('href', '/');
    expect(within(nav).getByRole('link', { name: 'Fixture World' })).toHaveAttribute(
      'href',
      '/worlds/fixture-world/stories',
    );
    expect(within(nav).getByRole('link', { name: 'Red Bunny' })).toHaveAttribute(
      'href',
      '/worlds/fixture-world/stories/red-bunny',
    );
    expect(within(nav).getByRole('link', { name: 'Scenes' })).toHaveAttribute(
      'href',
      '/worlds/fixture-world/stories/red-bunny/scenes',
    );
    expect(within(nav).getByText('Scene SCN-3')).toHaveAttribute('aria-current', 'page');
    expect(within(nav).queryByRole('link', { name: 'Scene SCN-3' })).not.toBeInTheDocument();
  });

  it('marks the story dashboard as current when there is no trail', () => {
    render(
      <MemoryRouter>
        <Breadcrumb
          worldSlug="fixture-world"
          worldDisplayName="Fixture World"
          storySlug="red-bunny"
          storyTitle="Red Bunny"
        />
      </MemoryRouter>,
    );

    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(nav).getByText('Red Bunny')).toHaveAttribute('aria-current', 'page');
    expect(within(nav).queryByRole('link', { name: 'Red Bunny' })).not.toBeInTheDocument();
  });
});
