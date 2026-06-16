// ── validators.js ────────────────────────────────────────
// All regex validation rules for the book form.
// Each function returns { valid: boolean, message: string }
//
// REGEX CATALOG:
//
// 1. TITLE — no leading/trailing spaces, no double spaces
//    Pattern: /^\S(?:.*\S)?$/
//    Example pass: "The Lean Startup"
//    Example fail: " The Lean Startup" (leading space)
//
// 2. AUTHOR — same rule + back-reference catches duplicate words
//    Pattern: /^\S(?:.*\S)?$/  +  /\b(\w+)\s+\1\b/i (advanced)
//    Example pass: "Eric Ries"
//    Example fail: "Eric Eric" (duplicate word — back-reference catches it)
//
// 3. PAGES — positive integer only
//    Pattern: /^[1-9]\d*$/
//    Example pass: "336"
//    Example fail: "0", "-1", "33.5"
//
// 4. TAG — letters, spaces, hyphens only
//    Pattern: /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/
//    Example pass: "Social Impact", "Sci-Fi"
//    Example fail: "123", "Design@"
//
// 5. DATE — YYYY-MM-DD format
//    Pattern: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/
//    Example pass: "2025-09-15"
//    Example fail: "15-09-2025", "2025-13-01"
//
// 6. NOTES — duplicate word detection (advanced back-reference)
//    Pattern: /\b(\w+)\s+\1\b/i
//    Example catch: "very very good" → warns about duplicate word
// ─────────────────────────────────────────────────────────

// ── RULE 1: Title ────────────────────────────────────────
// No leading/trailing spaces, no double internal spaces
const TITLE_REGEX        = /^\S(?:.*\S)?$/;
const DOUBLE_SPACE_REGEX = /\s{2,}/;

export function validateTitle(value) {
  if (!value || value.length === 0) {
    return { valid: false, message: 'Title is required.' };
  }
  if (!TITLE_REGEX.test(value)) {
    return { valid: false, message: 'Title cannot start or end with spaces.' };
  }
  if (DOUBLE_SPACE_REGEX.test(value)) {
    return { valid: false, message: 'Title cannot contain double spaces.' };
  }
  if (value.length > 200) {
    return { valid: false, message: 'Title must be under 200 characters.' };
  }
  return { valid: true, message: '' };
}

// ── RULE 2: Author ───────────────────────────────────────
// No leading/trailing spaces + back-reference catches
// duplicate words like "Eric Eric" or "Smith Smith"
const AUTHOR_REGEX    = /^\S(?:.*\S)?$/;
const DUPLICATE_WORD  = /\b(\w+)\s+\1\b/i;  // ← ADVANCED: back-reference

export function validateAuthor(value) {
  if (!value || value.length === 0) {
    return { valid: false, message: 'Author is required.' };
  }
  if (!AUTHOR_REGEX.test(value)) {
    return { valid: false, message: 'Author cannot start or end with spaces.' };
  }
  // Advanced: back-reference detects duplicate consecutive words
  const dupMatch = value.match(DUPLICATE_WORD);
  if (dupMatch) {
    return {
      valid: false,
      message: `Duplicate word detected: "${dupMatch[1]}". Did you type the name twice?`
    };
  }
  if (value.length > 100) {
    return { valid: false, message: 'Author must be under 100 characters.' };
  }
  return { valid: true, message: '' };
}

// ── RULE 3: Pages ────────────────────────────────────────
// Positive integer only — no decimals, no zero, no negatives
const PAGES_REGEX = /^[1-9]\d*$/;

export function validatePages(value) {
  const str = String(value).trim();
  if (!str || str.length === 0) {
    return { valid: false, message: 'Pages is required.' };
  }
  if (!PAGES_REGEX.test(str)) {
    return { valid: false, message: 'Pages must be a positive whole number (e.g. 336).' };
  }
  if (Number(str) > 99999) {
    return { valid: false, message: 'Pages seems too high. Please check.' };
  }
  return { valid: true, message: '' };
}

// ── RULE 4: Tag ──────────────────────────────────────────
// Letters, spaces, hyphens only — no numbers or symbols
// Tag is optional so empty string passes
const TAG_REGEX = /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/;

export function validateTag(value) {
  if (!value || value.trim().length === 0) {
    return { valid: true, message: '' }; // optional field
  }
  if (!TAG_REGEX.test(value.trim())) {
    return {
      valid: false,
      message: 'Tag can only contain letters, spaces, and hyphens (e.g. "Social Impact" or "Sci-Fi").'
    };
  }
  if (value.length > 50) {
    return { valid: false, message: 'Tag must be under 50 characters.' };
  }
  return { valid: true, message: '' };
}

// ── RULE 5: Date ─────────────────────────────────────────
// Must be YYYY-MM-DD format with valid month and day
const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function validateDate(value) {
  if (!value || value.length === 0) {
    return { valid: false, message: 'Date is required.' };
  }
  if (!DATE_REGEX.test(value)) {
    return {
      valid: false,
      message: 'Date must be in YYYY-MM-DD format (e.g. 2025-09-15).'
    };
  }
  // Check date is not in the future
  const selected = new Date(value);
  const today    = new Date();
  today.setHours(23, 59, 59, 999);
  if (selected > today) {
    return { valid: false, message: 'Date cannot be in the future.' };
  }
  return { valid: true, message: '' };
}

// ── RULE 6: Status ───────────────────────────────────────
const VALID_STATUSES = ['Want to Read', 'Reading', 'Finished'];

export function validateStatus(value) {
  if (!value || value.length === 0) {
    return { valid: false, message: 'Please select a reading status.' };
  }
  if (!VALID_STATUSES.includes(value)) {
    return { valid: false, message: 'Invalid status selected.' };
  }
  return { valid: true, message: '' };
}

// ── RULE 7: Notes — duplicate word warning (ADVANCED) ────
// Uses back-reference to find repeated consecutive words
// This is a WARNING not an error — notes are optional
const DUPLICATE_WORD_NOTES = /\b(\w+)\s+\1\b/i;

export function validateNotes(value) {
  if (!value || value.trim().length === 0) {
    return { valid: true, message: '' }; // optional
  }
  const dupMatch = value.match(DUPLICATE_WORD_NOTES);
  if (dupMatch) {
    return {
      valid: true, // still valid — just a warning
      message: `⚠️ Possible duplicate word: "${dupMatch[1]}"`
    };
  }
  return { valid: true, message: '' };
}

// ── VALIDATE FULL FORM ───────────────────────────────────
// Validates all fields at once.
// Returns { valid: boolean, errors: { fieldName: message } }

export function validateForm(data) {
  const errors = {};

  const titleResult  = validateTitle(data.title);
  const authorResult = validateAuthor(data.author);
  const pagesResult  = validatePages(data.pages);
  const tagResult    = validateTag(data.tag);
  const dateResult   = validateDate(data.dateAdded);
  const statusResult = validateStatus(data.status);

  if (!titleResult.valid)  errors.title     = titleResult.message;
  if (!authorResult.valid) errors.author    = authorResult.message;
  if (!pagesResult.valid)  errors.pages     = pagesResult.message;
  if (!tagResult.valid)    errors.tag       = tagResult.message;
  if (!dateResult.valid)   errors.dateAdded = dateResult.message;
  if (!statusResult.valid) errors.status    = statusResult.message;

  return {
    valid:  Object.keys(errors).length === 0,
    errors,
  };
}

// ── REAL-TIME SINGLE FIELD VALIDATOR ────────────────────
// Called on input event for instant feedback

export function validateField(name, value) {
  switch (name) {
    case 'title':     return validateTitle(value);
    case 'author':    return validateAuthor(value);
    case 'pages':     return validatePages(value);
    case 'tag':       return validateTag(value);
    case 'dateAdded': return validateDate(value);
    case 'status':    return validateStatus(value);
    case 'notes':     return validateNotes(value);
    default:          return { valid: true, message: '' };
  }
}