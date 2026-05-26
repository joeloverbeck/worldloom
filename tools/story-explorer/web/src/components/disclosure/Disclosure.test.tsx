import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Disclosure } from './Disclosure';

function TestDisclosure({ initialOpen = false }: { initialOpen?: boolean }): JSX.Element {
  return (
    <Disclosure initialOpen={initialOpen}>
      {({ isOpen, triggerProps, contentProps }) => (
        <>
          <button type="button" {...triggerProps}>
            {isOpen ? 'Hide details' : 'Show details'}
          </button>
          <section {...contentProps}>Hidden detail text</section>
        </>
      )}
    </Disclosure>
  );
}

describe('Disclosure', () => {
  it('connects trigger and content with aria-expanded and aria-controls', () => {
    render(<TestDisclosure />);

    const trigger = screen.getByRole('button', { name: 'Show details' });
    const content = screen.getByText('Hidden detail text', { selector: 'section' });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-controls', content.id);
    expect(content).toHaveAttribute('hidden');

    fireEvent.click(trigger);

    expect(screen.getByRole('button', { name: 'Hide details' })).toHaveAttribute('aria-expanded', 'true');
    expect(content).not.toHaveAttribute('hidden');
  });

  it('toggles with Enter and Space', () => {
    render(<TestDisclosure />);

    const trigger = screen.getByRole('button', { name: 'Show details' });

    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(screen.getByRole('button', { name: 'Hide details' })).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(screen.getByRole('button', { name: 'Hide details' }), { key: ' ' });
    expect(screen.getByRole('button', { name: 'Show details' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('can start open for consumers that need visible default content', () => {
    render(<TestDisclosure initialOpen />);

    expect(screen.getByRole('button', { name: 'Hide details' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Hidden detail text', { selector: 'section' })).not.toHaveAttribute('hidden');
  });
});
