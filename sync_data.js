const fs = require('fs');
const path = require('path');

// Paths
const tsxPath = path.join(__dirname, 'residential_constants.tsx');
const jsonPath = path.join(__dirname, 'HVACHome_Full_Backup_2026-02-07.json');
const tempJsPath = path.join(__dirname, 'temp_constants.js');

try {
    let tsxContent = fs.readFileSync(tsxPath, 'utf8');

    // 1. Remove imports
    tsxContent = tsxContent.replace(/^import .*?$/gm, '');

    // 2. Remove type annotations
    // Remove ": Type" or ": Type[]"
    // We use a more specific regex to avoid matching inside strings (though unlikely with : Space Capital)
    tsxContent = tsxContent.replace(/:\s*[A-Z]\w+(\[\])?/g, '');
    // Remove primitives
    tsxContent = tsxContent.replace(/:\s*string/g, '');
    tsxContent = tsxContent.replace(/:\s*number/g, '');
    tsxContent = tsxContent.replace(/:\s*boolean/g, '');
    tsxContent = tsxContent.replace(/:\s*void/g, '');
    tsxContent = tsxContent.replace(/:\s*any/g, '');

    // 3. Remove "export " keyword
    tsxContent = tsxContent.replace(/export\s+/g, '');

    // 4. Clean up any double empty lines for verify
    // tsxContent = tsxContent.replace(/\n\s*\n/g, '\n');

    // Add module.exports
    tsxContent += '\nmodule.exports = { RESIDENTIAL_PROPERTIES, RESIDENTIAL_APPLIANCES };';

    // Write temp file
    fs.writeFileSync(tempJsPath, tsxContent);

    // Require
    const data = require(tempJsPath);

    // Read JSON
    let currentJson = {};
    if (fs.existsSync(jsonPath)) {
        currentJson = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    }

    // New JSON
    const newJson = {
        properties: data.RESIDENTIAL_PROPERTIES,
        appliances: data.RESIDENTIAL_APPLIANCES,
        changeLogs: currentJson.changeLogs || [],
        exportDate: new Date().toISOString(),
        version: "1.1"
    };

    // Write
    fs.writeFileSync(jsonPath, JSON.stringify(newJson, null, 2));

    // Cleanup
    if (fs.existsSync(tempJsPath)) fs.unlinkSync(tempJsPath);

    console.log('Successfully synced data.');

} catch (error) {
    console.error('Error:', error);
    // If failed, print the first few lines of temp file to debug
    if (fs.existsSync(tempJsPath)) {
        console.log('--- Temp File Content (First 20 lines) ---');
        const content = fs.readFileSync(tempJsPath, 'utf8');
        console.log(content.split('\n').slice(0, 20).join('\n'));
        console.log('...');
    }
    process.exit(1);
}
