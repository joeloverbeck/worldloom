import '@testing-library/jest-dom';
import 'vitest-axe/extend-expect';

const NativeRequest = globalThis.Request;

class TestEnvironmentRequest extends NativeRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    try {
      super(input, init);
    } catch (error) {
      if (
        init?.signal &&
        error instanceof TypeError &&
        error.message.includes('Expected signal') &&
        error.message.includes('instance of AbortSignal')
      ) {
        const { signal: _signal, ...initWithoutSignal } = init;
        super(input, initWithoutSignal);
        return;
      }

      throw error;
    }
  }
}

globalThis.Request = TestEnvironmentRequest;

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value: () =>
    ({
      measureText: (text: string) => ({ width: text.length * 8 }),
    }) as unknown,
});
