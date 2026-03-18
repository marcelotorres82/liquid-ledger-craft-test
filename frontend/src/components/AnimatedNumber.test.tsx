import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AnimatedNumber from './AnimatedNumber';

describe('AnimatedNumber Component', () => {
  it('renders without crashing', () => {
    const { container } = render(<AnimatedNumber value={100} />);
    expect(container).toBeInTheDocument();
  });

  it('renders the initial formatted value (starts at 0 before animation)', () => {
    const { container } = render(<AnimatedNumber value={150} prefix="R$ " suffix=" %" decimals={2} />);
    // The spring animation starts at 0, so the initial render will show the 0 state formatted
    expect(container.textContent).toBe('R$ 0,00 %');
  });
});
