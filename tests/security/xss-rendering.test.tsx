import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SecretSentinel from '../../src/features/security/SecretSentinel';

describe('XSS Output Rendering Security Boundary', () => {
  const xssPayloads = [
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    '<svg onload=alert(1)>',
    '<div onmouseover="alert(1)">hover me</div>',
  ];

  it('renders XSS payloads as pure text/string nodes rather than executable HTML in SecretSentinel', () => {
    xssPayloads.forEach((payload) => {
      const { container } = render(<SecretSentinel content={payload} />);
      
      // The payload should be displayed literally as text
      expect(screen.getByText(payload)).toBeInTheDocument();
      
      // No executable DOM element/attributes (like onerror, onload, script tags) should be created
      const scripts = container.querySelectorAll('script');
      expect(scripts.length).toBe(0);

      const images = container.querySelectorAll('img');
      images.forEach((img) => {
        expect(img.getAttribute('onerror')).toBeNull();
      });

      const svgs = container.querySelectorAll('svg');
      svgs.forEach((svg) => {
        expect(svg.getAttribute('onload')).toBeNull();
      });
    });
  });

  it('verifies standard React element interpolation is safe against script elements in issue fields', () => {
    const payload = '<script>alert(2)</script>';
    const { container } = render(<div>{payload}</div>);
    
    expect(screen.getByText(payload)).toBeInTheDocument();
    const scripts = container.querySelectorAll('script');
    expect(scripts.length).toBe(0);
  });
});
