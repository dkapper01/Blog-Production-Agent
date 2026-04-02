/**
 * Loads the brand guide from memory/brand-guide.json.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { BrandGuide } from '../schemas';

const BRAND_GUIDE_PATH = path.join(process.cwd(), 'memory', 'brand-guide.json');

export function loadBrandGuide(): BrandGuide {
  const raw = fs.readFileSync(BRAND_GUIDE_PATH, 'utf-8');
  return JSON.parse(raw) as BrandGuide;
}
