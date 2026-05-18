import { maskPhi } from './phi-masker';

describe('maskPhi', () => {
  it('returns empty string unchanged', () => {
    expect(maskPhi('')).toBe('');
  });

  it('masks SSN (hyphenated)', () => {
    expect(maskPhi('SSN: 123-45-6789')).toContain('[SSN]');
    expect(maskPhi('SSN: 123-45-6789')).not.toContain('123-45-6789');
  });

  it('masks US phone numbers', () => {
    const variants = [
      '(310) 555-1234',
      '310-555-1234',
      '310.555.1234',
      '+1 310 555 1234',
    ];
    for (const phone of variants) {
      const result = maskPhi(`Call me at ${phone} please`);
      expect(result).toContain('[PHONE]');
      expect(result).not.toContain('555-1234');
    }
  });

  it('masks email addresses in body', () => {
    const result = maskPhi('Contact patient.jane@gmail.com for records');
    expect(result).toContain('[EMAIL]');
    expect(result).not.toContain('patient.jane@gmail.com');
  });

  it('masks DOB with keyword', () => {
    const result = maskPhi('DOB: 03/15/1985');
    expect(result).toContain('[DOB]');
  });

  it('masks medical record numbers', () => {
    const result = maskPhi('MRN: A12345678 attached');
    expect(result).toContain('[MRN]');
  });

  it('masks account numbers', () => {
    const result = maskPhi('Patient No. P-98765 is scheduled');
    expect(result).toContain('[ACCT]');
  });

  it('masks street addresses', () => {
    const result = maskPhi('Lives at 123 Main Street, CA 90210');
    expect(result).toContain('[ADDRESS]');
    expect(result).not.toContain('123 Main');
  });

  // fromName masking — full name only, no individual tokens
  it('masks sender full name', () => {
    const result = maskPhi('Signed by John Smith on behalf of State Farm', 'John Smith');
    expect(result).toContain('[NAME]');
    expect(result).not.toContain('John Smith');
    expect(result).toContain('State Farm'); // org name preserved
  });

  it('does NOT mask common words that are also short surnames (classification-safety)', () => {
    // "bill" in "medical bill" must not be masked even if fromName is "Bill Brown"
    const result = maskPhi('Settlement offer re: medical bill and insurance claim. Signed, Bill Brown.', 'Bill Brown');
    expect(result).not.toContain('Bill Brown');
    expect(result).toContain('medical bill'); // classification signal preserved
    expect(result).toContain('Settlement');
  });

  it('masks short-name senders by full name combination', () => {
    // "Bob Lee" — each part < 4 chars; must still mask the full name together
    const result = maskPhi('The client Bob Lee called today.', 'Bob Lee');
    expect(result).not.toContain('Bob Lee');
    expect(result).toContain('[NAME]');
  });

  it('masks salutation with first name only', () => {
    const result = maskPhi('Dear John, please find attached');
    expect(result).toContain('[NAME]');
    expect(result).not.toContain('Dear John');
  });

  it('masks salutation with full name', () => {
    const result = maskPhi('Dear Jane Doe, please find attached');
    expect(result).toContain('[NAME]');
    expect(result).not.toContain('Jane Doe');
  });

  it('masks titled names with period', () => {
    const result = maskPhi('Dr. Robert Williams ordered the MRI');
    expect(result).toContain('[NAME]');
    expect(result).not.toContain('Robert Williams');
  });

  it('masks titled names without period', () => {
    // "Dr Williams" — no trailing dot on title
    const result = maskPhi('Dr Williams called about the records');
    expect(result).toContain('[NAME]');
    expect(result).not.toContain('Williams');
  });

  it('preserves organization names', () => {
    const text = 'State Farm Insurance sent settlement offer from Cedars-Sinai';
    const result = maskPhi(text);
    expect(result).toContain('State Farm');
    expect(result).toContain('Cedars-Sinai');
  });

  it('preserves legal and medical terminology', () => {
    const text = 'Settlement offer regarding medical records and insurance coverage';
    const result = maskPhi(text);
    expect(result).toContain('Settlement');
    expect(result).toContain('medical records');
    expect(result).toContain('insurance coverage');
  });

  it('preserves case numbers', () => {
    const result = maskPhi('Re: Case 2024-PI-001 settlement discussion');
    expect(result).toContain('2024-PI-001');
  });

  it('handles undefined fromName gracefully', () => {
    expect(() => maskPhi('some text', undefined)).not.toThrow();
  });

  it('masks multiple PHI types in one string', () => {
    const text = 'Dear Mary Johnson, SSN 987-65-4321, DOB: 01/01/1990, call (213) 555-9876';
    const result = maskPhi(text, 'Mary Johnson');
    expect(result).not.toContain('Mary Johnson');
    expect(result).not.toContain('987-65-4321');
    expect(result).not.toContain('213) 555-9876');
    expect(result).toContain('[NAME]');
    expect(result).toContain('[SSN]');
    expect(result).toContain('[PHONE]');
  });
});

describe('Korean name masking', () => {
  it('masks Korean full name after 고객:', () => {
    expect(maskPhi('고객: 김민준')).toContain('[NAME]')
    expect(maskPhi('고객: 김민준')).not.toContain('김민준')
  })

  it('masks Korean name after 의뢰인:', () => {
    expect(maskPhi('의뢰인: 박서연입니다')).toContain('[NAME]')
  })

  it('masks Korean name after 안녕하세요', () => {
    expect(maskPhi('안녕하세요 이준호 고객님')).toContain('[NAME]')
  })

  it('does not mask single Korean char', () => {
    expect(maskPhi('안')).toBe('안')
  })
})

describe('DOL date masking', () => {
  it('masks DOL date pattern', () => {
    expect(maskPhi('DOL 04/20/2025')).toContain('[DOL]')
    expect(maskPhi('DOL 04/20/2025')).not.toContain('04/20/2025')
  })

  it('masks DOL with colon', () => {
    expect(maskPhi('DOL: 03/24/2024')).toContain('[DOL]')
  })

  it('masks Date of Loss pattern', () => {
    expect(maskPhi('Date of Loss: 03/24/2024')).toContain('[DOL]')
  })
})
