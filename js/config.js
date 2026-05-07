export const SUPA_URL = 'https://qbodqcxhmlkqvmdxstrn.supabase.co';
export const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFib2RxY3hobWxrcXZtZHhzdHJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwODM3NTIsImV4cCI6MjA5MTY1OTc1Mn0.Xh5vyf0A2fieS5weyho-kHBwL5Red64L40D2axTEBNY';

export const DAYS = ['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'];

// ── Color Palette (Single Source of Truth) ────────────────────────────────────
export const CAT_PALETTE = [
  { color: '#7a5c20', bg: '#f5ede0' }, // warmgelb    – Pasta / Getreide
  { color: '#8a4028', bg: '#faeee8' }, // terrakotta  – Fleisch
  { color: '#5a7a3a', bg: '#eaf3de' }, // grün        – Vegetarisch
  { color: '#2e7a5a', bg: '#dff2ea' }, // smaragd     – Vegan
  { color: '#c07820', bg: '#fdf0d8' }, // orange      – Curry / Eintopf
  { color: '#4a6a90', bg: '#e4eff8' }, // stahlblau   – Fisch
  { color: '#6a7a20', bg: '#f0f4d8' }, // oliv        – Salat
  { color: '#3a6a8a', bg: '#dceef8' }, // blau        – Suppe
  { color: '#7a4a8a', bg: '#f5eef8' }, // lila        – Frühstück
  { color: '#8a5a20', bg: '#f8eed8' }, // braun       – Snack / Vorspeise
  { color: '#8a3060', bg: '#f8e8f0' }, // pink        – Dessert / Backen
  { color: '#5a5aaa', bg: '#eeeefc' }, // indigo      – Pizza / Flammkuchen
  { color: '#68686a', bg: '#f0f0ee' }, // grau        – Sonstiges
];

export const AUF_PALETTE = [
  { color: '#598234', bg: '#eef5e8' }, // grün
  { color: '#6a7a20', bg: '#f0f4e0' }, // oliv
  { color: '#8a3838', bg: '#f5eeee' }, // rot
];

export const TAG_FALLBACK = { color: '#888888', bg: '#f0f0f0' };

// ── Default Settings ──────────────────────────────────────────────────────────
// Wird nur beim allerersten Start einer neuen Family verwendet (keine Settings in DB).
// Für bestehende Families: Migration via migrate-categories.js ausführen.
export const DEFAULT_SETTINGS = {
  cats: [
    { id: 'cat_pasta',        label: 'Pasta / Risotto',         ...CAT_PALETTE[0]  },
    { id: 'cat_fleisch',      label: 'Fleisch / Geflügel',      ...CAT_PALETTE[1]  },
    { id: 'cat_vegetarisch',  label: 'Vegetarisch',             ...CAT_PALETTE[2]  },
    { id: 'cat_vegan',        label: 'Vegan',                   ...CAT_PALETTE[3]  },
    { id: 'cat_curry',        label: 'Curry / Eintopf',         ...CAT_PALETTE[4]  },
    { id: 'cat_fisch',        label: 'Fisch / Meeresfrüchte',   ...CAT_PALETTE[5]  },
    { id: 'cat_salat',        label: 'Salat',                   ...CAT_PALETTE[6]  },
    { id: 'cat_suppe',        label: 'Suppe',                   ...CAT_PALETTE[7]  },
    { id: 'cat_fruehstueck',  label: 'Frühstück / Brunch',      ...CAT_PALETTE[8]  },
    { id: 'cat_snack',        label: 'Snack / Vorspeise',       ...CAT_PALETTE[9]  },
    { id: 'cat_dessert',      label: 'Dessert / Backen',        ...CAT_PALETTE[10] },
    { id: 'cat_pizza',        label: 'Pizza / Flammkuchen',     ...CAT_PALETTE[11] },
    { id: 'cat_sonstiges',    label: 'Sonstiges',               ...CAT_PALETTE[12] },
  ],
  aufwand: [
    { id: 'auf_einfach', label: 'einfach', ...AUF_PALETTE[0] },
    { id: 'auf_mittel',  label: 'mittel',  ...AUF_PALETTE[1] },
    { id: 'auf_schwer',  label: 'schwer',  ...AUF_PALETTE[2] },
  ]
};

export const DEFAULT_EINHEITEN = [
  { canonical: 'Stück',        variants: ['stück', 'stk', 'stk.', 'stück.'] },
  { canonical: 'g',            variants: ['g', 'gr', 'gramm', 'gram'] },
  { canonical: 'kg',           variants: ['kg', 'kilogramm', 'kilogram'] },
  { canonical: 'dl',           variants: ['dl'] },
  { canonical: 'cl',           variants: ['cl'] },
  { canonical: 'ml',           variants: ['ml', 'milliliter'] },
  { canonical: 'l',            variants: ['l', 'liter', 'litre'] },
  { canonical: 'EL',           variants: ['el', 'essl', 'esslöffel'] },
  { canonical: 'TL',           variants: ['tl', 'teel', 'teelöffel'] },
  { canonical: 'Prise',        variants: ['prise', 'prisen'] },
  { canonical: 'Bund',         variants: ['bund'] },
  { canonical: 'Dose',         variants: ['dose', 'dosen'] },
  { canonical: 'Pck.',         variants: ['pck', 'pck.', 'päckchen', 'packung'] },
  { canonical: 'Becher',       variants: ['becher'] },
  { canonical: 'Glas',         variants: ['glas', 'gläser'] },
  { canonical: 'Zehe',         variants: ['zehe', 'zehen', 'zehe/n'] },
  { canonical: 'Scheibe',      variants: ['scheibe', 'scheiben'] },
  { canonical: 'Zweig',        variants: ['zweig', 'zweige'] },
  { canonical: 'Blatt',        variants: ['blatt', 'blätter'] },
  { canonical: 'Handvoll',     variants: ['handvoll'] },
  { canonical: 'Msp.',         variants: ['msp', 'msp.', 'messerspitze'] },
  { canonical: 'Würfel',       variants: ['würfel'] },
  { canonical: 'Knolle',       variants: ['knolle', 'knollen'] },
  { canonical: 'Kopf',         variants: ['kopf', 'köpfe'] },
  { canonical: 'Stange',       variants: ['stange', 'stangen'] },
  { canonical: 'Tasse',        variants: ['tasse', 'tassen'] },
  { canonical: 'Pkg.',         variants: ['pkg', 'pkg.'] },
];

