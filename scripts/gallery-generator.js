#!/usr/bin/env node

/**
 * Gallery Generator Script (Modular Version)
 *
 * Scannt automatisch die Ordner in public/gallery/ und generiert:
 * - Eine category.json in jedem Kategorie-Ordner
 * - Eine zentrale gallery.json mit Kategorie-Metadaten
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
const INDEX_FILE = path.join(GALLERY_PATH, 'gallery.json');

// Unterstützte Bildformate
const SUPPORTED_FORMATS = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'];

// Kategorie-Definitionen
const CATEGORIES = [
  {
    id: 'backgrounds',
    name: 'Hintergründe',
    name_en: 'Backgrounds',
    icon: '🎨',
    description: 'Farbverläufe und Hintergrundbilder',
    description_en: 'Gradients and background images'
  },
  {
    id: 'elements',
    name: 'Elemente',
    name_en: 'Elements',
    icon: '✨',
    description: 'Grafische Formen und Objekte (inkl. PNG mit Transparenz)',
    description_en: 'Graphic shapes and objects (incl. transparent PNGs)'
  },
  {
    id: 'patterns',
    name: 'Muster',
    name_en: 'Patterns',
    icon: '🔲',
    description: 'Wiederholende Muster und Texturen',
    description_en: 'Repeating patterns and textures'
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

  // PNG-Transparenz-Tag hinzufügen
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.png') {
    tags.push('transparent');
  }

  return tags;
}

/**
 * Ermittelt die Bildgröße (falls möglich)
 */
function getImageInfo(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const stats = fs.statSync(filePath);

  return {
    size: stats.size,
    sizeFormatted: formatFileSize(stats.size),
    format: ext.replace('.', '').toUpperCase(),
    hasTransparency: ext === '.png' || ext === '.webp' || ext === '.gif'
  };
}

/**
 * Formatiert Dateigröße
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Scannt einen Kategorie-Ordner nach Bildern und erstellt category.json
 */
function scanAndSaveCategory(categoryDef) {
  const categoryPath = path.join(GALLERY_PATH, categoryDef.id);
  const categoryJsonPath = path.join(categoryPath, 'category.json');
  const images = [];

  // Prüfen ob Ordner existiert
  if (!fs.existsSync(categoryPath)) {
    console.log(`  📁 Erstelle Ordner: ${categoryDef.id}/`);
    fs.mkdirSync(categoryPath, { recursive: true });
  }

  // Dateien im Ordner lesen
  const files = fs.readdirSync(categoryPath);

  files.forEach(file => {
    const ext = path.extname(file).toLowerCase();

    // Nur unterstützte Formate (keine JSON-Dateien)
    if (!SUPPORTED_FORMATS.includes(ext)) {
      return;
    }

    const fullPath = path.join(categoryPath, file);
    const imageInfo = getImageInfo(fullPath);

    // Relativer Pfad (ohne führenden Slash) für Kompatibilität mit Subpfaden
    const filePath = `gallery/${categoryDef.id}/${file}`;

    images.push({
      id: generateId(categoryDef.id, file),
      name: fileNameToDisplayName(file),
      name_en: fileNameToDisplayName(file),
      file: filePath,
      thumbnail: filePath,
      format: imageInfo.format,
      size: imageInfo.sizeFormatted,
      hasTransparency: imageInfo.hasTransparency,
      tags: extractTags(file, categoryDef.id)
    });
  });

  // Sortiere nach Name
  images.sort((a, b) => a.name.localeCompare(b.name));

  // Category JSON erstellen
  const categoryJson = {
    _generated: new Date().toISOString(),
    _info: `Automatisch generiert für Kategorie "${categoryDef.name}". Führe "npm run gallery:update" aus, um zu aktualisieren.`,
    category: {
      id: categoryDef.id,
      name: categoryDef.name,
      name_en: categoryDef.name_en,
      icon: categoryDef.icon,
      description: categoryDef.description,
      description_en: categoryDef.description_en
    },
    count: images.length,
    images: images
  };

  // JSON-Datei schreiben
  fs.writeFileSync(categoryJsonPath, JSON.stringify(categoryJson, null, 2), 'utf8');

  return {
    ...categoryDef,
    count: images.length,
    jsonFile: `gallery/${categoryDef.id}/category.json`
  };
}

/**
 * Hauptfunktion - Generiert alle JSON-Dateien
 */
function generateGallery() {
  console.log('\n🖼️  Gallery Generator (Modular)\n');
  console.log('━'.repeat(50));

  // Prüfen ob gallery-Ordner existiert
  if (!fs.existsSync(GALLERY_PATH)) {
    console.log('📁 Erstelle gallery-Ordner...');
    fs.mkdirSync(GALLERY_PATH, { recursive: true });
  }

  // Alle Kategorien scannen und speichern
  const categoryInfos = [];
  let totalImages = 0;

  CATEGORIES.forEach(categoryDef => {
    console.log(`\n📂 Verarbeite ${categoryDef.name} (${categoryDef.id}/)...`);

    const info = scanAndSaveCategory(categoryDef);
    categoryInfos.push(info);
    totalImages += info.count;

    console.log(`   ✓ ${info.count} Bilder gefunden`);
    console.log(`   📄 category.json erstellt`);
  });

  // Haupt-Index erstellen
  const galleryIndex = {
    _generated: new Date().toISOString(),
    _version: '2.0',
    _info: 'Modulare Galerie-Struktur. Jede Kategorie hat eine eigene category.json.',
    totalImages: totalImages,
    categories: categoryInfos.map(cat => ({
      id: cat.id,
      name: cat.name,
      name_en: cat.name_en,
      icon: cat.icon,
      description: cat.description,
      description_en: cat.description_en,
      count: cat.count,
      jsonFile: cat.jsonFile
    }))
  };

  // Index-Datei schreiben
  fs.writeFileSync(INDEX_FILE, JSON.stringify(galleryIndex, null, 2), 'utf8');

  console.log('\n' + '━'.repeat(50));
  console.log(`\n✅ Galerie erfolgreich generiert!`);
  console.log(`   📊 Gesamt: ${totalImages} Bilder in ${CATEGORIES.length} Kategorien`);
  console.log(`\n   📄 Erstellte Dateien:`);
  console.log(`      • gallery/gallery.json (Index)`);
  categoryInfos.forEach(cat => {
    console.log(`      • gallery/${cat.id}/category.json (${cat.count} Bilder)`);
  });
  console.log('');
}

// Script ausführen
generateGallery();
