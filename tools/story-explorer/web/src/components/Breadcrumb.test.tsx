import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { Breadcrumb } from './Breadcrumb';

describe('Breadcrumb', () => {
  it('renders the semantic world story branch and page hierarchy', () => {
    render(
      <MemoryRouter>
        <Breadcrumb
          worldSlug="fixture-world"
          worldDisplayName="Fixture World"
          storySlug="red-bunny"
          storyTitle="Red Bunny"
          branchId="BR-3"
          pageId="PG-12"
          parentPageId="PG-7"
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
      '/worlds/fixture-world/stories/red-bunny/entry',
    );
    expect(within(nav).getByText('Branch BR-3')).toBeInTheDocument();
    expect(within(nav).getByText('PG-12')).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Parent: PG-7' })).toHaveAttribute(
      'href',
      '/worlds/fixture-world/stories/red-bunny/pages/PG-7',
    );
  });

  it('omits the parent page link for root pages', () => {
    render(
      <MemoryRouter>
        <Breadcrumb
          worldSlug="fixture-world"
          worldDisplayName="Fixture World"
          storySlug="red-bunny"
          storyTitle="Red Bunny"
          branchId="BR-1"
          pageId="PG-1"
          parentPageId={null}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('link', { name: /Parent:/ })).not.toBeInTheDocument();
  });
});
