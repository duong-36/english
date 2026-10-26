const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const inputPath = 'C:\\Users\\ADMIN\\Downloads\\TỪ VỰNG VER 13.xlsx';
const outputDownloads = 'C:\\Users\\ADMIN\\Downloads\\TỪ VỰNG VER 13_FIXED.xlsx';
const outputData = path.join(__dirname, 'data', 'TỪ VỰNG VER 13_FIXED.xlsx');

console.log('Reading V13 from:', inputPath);
const srcWb = xlsx.readFile(inputPath);

const newWb = xlsx.utils.book_new();

for (const oldSheetName of srcWb.SheetNames) {
  const s = srcWb.Sheets[oldSheetName];
  const range = xlsx.utils.decode_range(s['!ref'] || 'A1');

  // Determine new sheet name
  let newSheetName = oldSheetName;
  if (oldSheetName.trim().toUpperCase() === 'T9V13') {
    newSheetName = 'TEST 9';
  } else if (oldSheetName.trim().toUpperCase() === 'T10 V13') {
    newSheetName = 'TEST 10';
  }

  // 1. Identify Left data start
  let leftHeaderRow = -1;
  let leftDataStartRow = -1;
  for (let r = 0; r <= 3; r++) {
    const valA = s[xlsx.utils.encode_cell({r, c: 0})]?.v;
    if (String(valA).trim().toUpperCase() === 'STT') {
      leftHeaderRow = r;
      leftDataStartRow = r + 1;
      break;
    }
  }

  // Get Left headers
  let hSTT = s[xlsx.utils.encode_cell({r: leftHeaderRow, c: 0})]?.v || 'STT';
  let hWord = s[xlsx.utils.encode_cell({r: leftHeaderRow, c: 1})]?.v || 'Từ vựng';
  let hIPA = s[xlsx.utils.encode_cell({r: leftHeaderRow, c: 2})]?.v || 'Phiên âm';
  let hMeaning = s[xlsx.utils.encode_cell({r: leftHeaderRow, c: 3})]?.v || 'Nghĩa tiếng Việt';

  // Read Left items
  const combinedItems = [];
  for (let r = leftDataStartRow; r <= range.e.r; r++) {
    const wordVal = s[xlsx.utils.encode_cell({r, c: 1})]?.v;
    if (wordVal !== undefined && String(wordVal).trim() !== '') {
      const ipaVal = s[xlsx.utils.encode_cell({r, c: 2})]?.v || '';
      const meaningVal = s[xlsx.utils.encode_cell({r, c: 3})]?.v || '';
      combinedItems.push({
        word: String(wordVal).trim(),
        ipa: String(ipaVal).trim(),
        meaning: String(meaningVal).trim()
      });
    } else {
      // If col B is empty, stop left reading if next is also empty
      const nextWord = s[xlsx.utils.encode_cell({r: r + 1, c: 1})]?.v;
      if (!nextWord) break;
    }
  }

  const leftCount = combinedItems.length;

  // 2. Identify Right data
  let colSTT = -1;
  let rightDataStartRow = -1;
  for (let r = 1; r <= 3; r++) {
    for (let c = 4; c <= 8; c++) {
      if (String(s[xlsx.utils.encode_cell({r, c})]?.v).trim() === '1') {
        colSTT = c;
        rightDataStartRow = r;
        break;
      }
    }
    if (colSTT !== -1) break;
  }

  if (colSTT === -1) {
    console.error(`ERROR: Could not find right-side data in sheet "${oldSheetName}"`);
    continue;
  }

  const colWord = colSTT + 1;
  const colPOS = colSTT + 2;
  const colIPA = colSTT + 3;
  const colMeaning = colSTT + 4;

  let rightCount = 0;
  for (let r = rightDataStartRow; r <= range.e.r; r++) {
    const wordVal = s[xlsx.utils.encode_cell({r, c: colWord})]?.v;
    if (wordVal !== undefined && String(wordVal).trim() !== '') {
      const ipaVal = s[xlsx.utils.encode_cell({r, c: colIPA})]?.v || '';
      const meaningVal = s[xlsx.utils.encode_cell({r, c: colMeaning})]?.v || '';
      combinedItems.push({
        word: String(wordVal).trim(),
        ipa: String(ipaVal).trim(),
        meaning: String(meaningVal).trim()
      });
      rightCount++;
    } else {
      const nextWord = s[xlsx.utils.encode_cell({r: r + 1, c: colWord})]?.v;
      if (!nextWord) break;
    }
  }

  console.log(`Sheet "${oldSheetName}" -> "${newSheetName}": Left=${leftCount}, Right=${rightCount}, Total=${combinedItems.length}`);

  // 3. Create new worksheet
  const newSheetData = [
    [hSTT, hWord, hIPA, hMeaning]
  ];

  for (let i = 0; i < combinedItems.length; i++) {
    const item = combinedItems[i];
    newSheetData.push([
      i + 1,
      item.word,
      item.ipa,
      item.meaning
    ]);
  }

  const newWs = xlsx.utils.aoa_to_sheet(newSheetData);

  // Set column widths
  newWs['!cols'] = [
    { wch: 8 },  // STT
    { wch: 32 }, // Từ vựng / Tiếng Anh
    { wch: 28 }, // Phiên âm
    { wch: 45 }  // Nghĩa
  ];

  xlsx.utils.book_append_sheet(newWb, newWs, newSheetName);
}

// Write to Downloads
xlsx.writeFile(newWb, outputDownloads);
console.log('Saved fixed file to Downloads:', outputDownloads);

// Write to projects/english/data/
xlsx.writeFile(newWb, outputData);
console.log('Saved fixed file to data directory:', outputData);

// Try to write to original file path if unlocked
try {
  xlsx.writeFile(newWb, inputPath);
  console.log('Overwritten original file:', inputPath);
} catch (e) {
  console.log('Note: Original file is locked by another program (WPS Office), could not directly overwrite:', e.message);
}
