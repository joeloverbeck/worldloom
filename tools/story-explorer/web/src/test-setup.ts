import '@testing-library/jest-dom';
import 'vitest-axe/extend-expect';

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value: () =>
    ({
      measureText: (text: string) => ({ width: text.length * 8 }),
    }) as unknown,
});
