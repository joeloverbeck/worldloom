import type { ReactNode } from 'react';

import type { DisclosureState } from './use-disclosure';
import { useDisclosure } from './use-disclosure';

interface DisclosureProps {
  initialOpen?: boolean;
  children: (state: DisclosureState) => ReactNode;
}

export function Disclosure({ initialOpen = false, children }: DisclosureProps): JSX.Element {
  const state = useDisclosure(initialOpen);

  return <>{children(state)}</>;
}
