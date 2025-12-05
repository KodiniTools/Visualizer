#!/usr/bin/env node

/**
 * Gallery Generator Script
 *
 * Scannt automatisch die Ordner in public/gallery/ und generiert
 * die gallery.json mit allen gefundenen Bildern.
 *
 * Unterstützte Formate: PNG, JPG, JPEG, WebP, SVG, GIF
 *
 * Verwendung: npm run gallery:update
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Konfiguration
const GALLERY_PATH = path.join(__dirname, '..', 'public', 'gallery');
const OUTPUT_FILE = path.join(GALLERY_PATH, 'gallery.json');

// Unterstützte Bildformate
const SUPPORTED_FORMATS = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'];

// Kategorie-Definitionen
const CATEGORIES = [
  {
    id: 'backgrounds',
    name: 'Hintergründe',
    name_en: 'Backgrounds',
    icon: '🎨',
    description: 'Farbverläufe und Hintergrundbilder'
  },
  {
    id: 'elements',
    name: 'Elemente',
    name_en: 'Elements',
    icon: '✨',
    description: 'Grafische Formen und Objekte'
  },
  {
    id: 'patterns',
    name: 'Muster',
    name_en: 'Patterns',
    icon: '🔲',
    description: 'Wiederholende Muster und Texturen'
  }
];

/**
 * Wandelt einen Dateinamen in einen lesbaren Namen um
 * z.B. "mein-tolles-bild.png" → "Mein Tolles Bild"
 */
function fileNameToDisplayName(fileName) {
  // Dateiendung entfernen
  const nameWithoutExt = path.basename(fileName, path.extname(fileName));

  // Bindestriche und Unterstriche durch Leerzeichen ersetzen
  const withSpaces = nameWithoutExt.replace(/[-_]/g, ' ');

  // Jeden Wortanfang großschreiben
  const capitalized = withSpaces.replace(/\b\w/g, char => char.toUpperCase());

  return capitalized;
}

/**
 * Generiert eine eindeutige ID aus Kategorie und Dateiname
 */
function generateId(category, fileName) {
  const nameWithoutExt = path.basename(fileName, path.extname(fileName));
  const cleanName = nameWithoutExt.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const prefix = category.substring(0, 2);
  return `${prefix}-${cleanName}`;
}

/**
 * Extrahiert Tags aus dem Dateinamen
 */
function extractTags(fileName, category) {
  const nameWithoutExt = path.basename(fileName, path.extname(fileName));
  const words = nameWithoutExt.toLowerCase().split(/[-_\s]+/);

  // Kategorie als Tag hinzufügen
  const tags = [category];

  // Wörter als Tags hinzufügen (mindestens 2 Zeichen)
  words.forEach(word => {
    if (word.length >= 2 && !tags.includes(word)) {
      tags.push(word);
    }
  });

  return tags;
}

/**
 * Scannt einen Kategorie-Ordner nach Bildern
 */
function scanCategory(categoryId) {
  const categoryPath = path.join(GALLERY_PATH, categoryId);
  const images = [];

  // Prüfen ob Ordner existiert
  if (!fs.existsSync(categoryPath)) {
    console.log(`  📁 Erstelle Ordner: ${categoryId}/`);
    fs.mkdirSync(categoryPath, { recursive: true });
    return images;
  }

  // Dateien im Ordner lesen
  const files = fs.readdirSync(categoryPath);

  files.forEach(file => {
    const ext = path.extname(file).toLowerCase();

    // Nur unterstützte Formate
    if (!SUPPORTED_FORMATS.includes(ext)) {
      return;
    }

    const filePath = `/gallery/${categoryId}/${file}`;

    images.push({
      id: generateId(categoryId, file),
      category: categoryId,
      name: fileNameToDisplayName(file),
      name_en: fileNameToDisplayName(file),
      file: filePath,
      thumbnail: filePath,
      tags: extractTags(file, categoryId)
    });
  });

  return images;
}

/**
 * Hauptfunktion - Generiert die gallery.json
 */
function generateGallery() {
  console.log('\n🖼️  Gallery Generator\n');
  console.log('━'.repeat(50));

  // Prüfen ob gallery-Ordner existiert
  if (!fs.existsSync(GALLERY_PATH)) {
    console.log('📁 Erstelle gallery-Ordner...');
    fs.mkdirSync(GALLERY_PATH, { recursive: true });
  }

  // Alle Kategorien scannen
  const allImages = [];

  CATEGORIES.forEach(category => {
    console.log(`\n📂 Scanne ${category.name} (${category.id}/)...`);
    const images = scanCategory(category.id);
    allImages.push(...images);
    console.log(`   ✓ ${images.length} Bilder gefunden`);

    // Gefundene Bilder auflisten
    images.forEach(img => {
      console.log(`     • ${img.name}`);
    });
  });

  // Gallery-Objekt erstellen
  const gallery = {
    _generated: new Date().toISOString(),
    _info: 'Diese Datei wird automatisch generiert. Führe "npm run gallery:update" aus, um sie zu aktualisieren.',
    categories: CATEGORIES,
    images: allImages
  };

  // JSON-Datei schreiben
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(gallery, null, 2), 'utf8');

  console.log('\n' + '━'.repeat(50));
  console.log(`\n✅ gallery.json erfolgreich generiert!`);
  console.log(`   📊 Gesamt: ${allImages.length} Bilder in ${CATEGORIES.length} Kategorien\n`);
}

// Script ausführen
generateGallery();
