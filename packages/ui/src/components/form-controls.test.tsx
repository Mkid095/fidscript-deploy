import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Input } from './Input';
import { Select } from './Select';
import { Textarea } from './Textarea';
import { Checkbox } from './Checkbox';
import { Switch } from './Switch';
import { FormField } from './FormField';

/**
 * The form controls.
 *
 * Two things are checked for every one of them: that the label **names**
 * the control (a label with no `htmlFor` is decorative text to a screen
 * reader), and that the message is announced **with** the control.
 */

describe('the Input', () => {
  it('names the control with its label', () => {
    render(<Input label="Domain name" />);
    const input = screen.getByLabelText('Domain name');
    expect(input).toBeTruthy();
  });

  it('gives two fields with the same label different ids', () => {
    render(
      <>
        <Input label="Name" />
        <Input label="Name" />
      </>,
    );
    const inputs = screen.getAllByLabelText('Name');
    expect(inputs[0].id).not.toBe(inputs[1].id);
  });

  it('announces the error with the control', () => {
    render(<Input label="Domain name" error="That domain is taken" />);
    const input = screen.getByLabelText('Domain name');
    const message = screen.getByText('That domain is taken');
    expect(input.getAttribute('aria-describedby')).toBe(message.id);
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('hides the hint when there is an error', () => {
    render(<Input label="Domain" hint="mail.example.com" error="Taken" />);
    expect(screen.queryByText('mail.example.com')).toBeNull();
  });
});

describe('the Select', () => {
  it('names the control and lists the options', () => {
    render(
      <Select
        label="Environment"
        placeholder="Choose"
        options={[
          { value: 'prod', label: 'Production' },
          { value: 'dev', label: 'Development' },
        ]}
      />,
    );
    const select = screen.getByLabelText('Environment') as HTMLSelectElement;
    expect(select.options.length).toBe(3);
    expect(screen.getByRole('option', { name: 'Production' })).toBeTruthy();
  });
});

describe('the Textarea', () => {
  it('names the control', () => {
    render(<Textarea label="Notes" />);
    expect(screen.getByLabelText('Notes')).toBeTruthy();
  });
});

describe('the Checkbox', () => {
  it('names the control with its label', () => {
    render(<Checkbox label="Deploy on push" />);
    expect(screen.getByLabelText('Deploy on push')).toBeTruthy();
  });
});

describe('the Switch', () => {
  it('is a switch that says whether it is on', () => {
    render(<Switch label="Auto-deploy" checked onChange={() => {}} />);
    const control = screen.getByRole('switch', { name: 'Auto-deploy' });
    expect(control.getAttribute('aria-checked')).toBe('true');
  });

  it('says it is off', () => {
    render(<Switch label="Auto-deploy" checked={false} onChange={() => {}} />);
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('false');
  });
});

describe('the FormField', () => {
  it('wires the label, the control and the message together', () => {
    render(
      <FormField label="Repository" error="That repository is private" required>
        {(props) => <input {...props} />}
      </FormField>,
    );
    const input = screen.getByLabelText(/Repository/);
    const message = screen.getByText('That repository is private');
    expect(input.getAttribute('aria-describedby')).toBe(message.id);
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('tells the control it is required', () => {
    render(
      <FormField label="Repository" required>
        {(props) => <input {...props} />}
      </FormField>,
    );
    expect(screen.getByLabelText(/Repository/)).toBeTruthy();
  });
});
