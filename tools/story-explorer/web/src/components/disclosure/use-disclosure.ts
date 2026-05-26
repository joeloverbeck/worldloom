import type { KeyboardEvent } from 'react';
import { useCallback, useId, useState } from 'react';

export interface DisclosureState {
  isOpen: boolean;
  toggle: () => void;
  triggerProps: {
    'aria-expanded': boolean;
    'aria-controls': string;
    onClick: () => void;
    onKeyDown: (event: KeyboardEvent) => void;
  };
  contentProps: {
    id: string;
    hidden: boolean;
  };
}

export function useDisclosure(initialOpen = false): DisclosureState {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const reactId = useId();
  const contentId = `disclosure-${reactId.replace(/:/g, '')}`;
  const toggle = useCallback(() => setIsOpen((open) => !open), []);

  return {
    isOpen,
    toggle,
    triggerProps: {
      'aria-expanded': isOpen,
      'aria-controls': contentId,
      onClick: toggle,
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggle();
        }
      },
    },
    contentProps: {
      id: contentId,
      hidden: !isOpen,
    },
  };
}
