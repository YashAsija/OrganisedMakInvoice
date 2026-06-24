const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'Dashboard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const interfaces = `
export interface MasterVendor { id: string; name: string; company?: string; email?: string; phone?: string; address?: string; category?: string; [key: string]: string | undefined; }
export interface MasterHsnCode { id: string; code: string; description: string; gstRate: number; [key: string]: string | number | undefined; }
export interface MasterGlAccount { id: string; code: string; name: string; type: string; [key: string]: string | undefined; }
export interface MasterMaterial { id: string; name: string; rate: number; hsn: string; uom: string; category: string; [key: string]: string | number | undefined; }
export interface MasterCategory { id: string; name: string; description?: string; [key: string]: string | undefined; }
export interface MasterSubCategory { id: string; category: string; name: string; [key: string]: string | undefined; }
export interface MasterMapping { id: string; item: string; glAccount: string; taxRate: number; [key: string]: string | number | undefined; }
export interface MasterPackingUnit { id: string; name: string; [key: string]: string | undefined; }
export interface MasterMeasurementUnit { id: string; name: string; [key: string]: string | undefined; }
export type MasterItemType = MasterVendor | MasterHsnCode | MasterGlAccount | MasterMaterial | MasterCategory | MasterSubCategory | MasterMapping | MasterPackingUnit | MasterMeasurementUnit;
`;

// Insert interfaces after imports
content = content.replace(/import TemplateManager from '.\/TemplateManager';/, "import TemplateManager from './TemplateManager';\n" + interfaces);

// Replace state generic types
content = content.replace(/useState<any \| null>/g, "useState<MasterItemType | null>");
content = content.replace(/const \[vendors, setVendors\] = useState<any\[\]>/g, "const [vendors, setVendors] = useState<MasterVendor[]>");
content = content.replace(/const \[hsnCodes, setHsnCodes\] = useState<any\[\]>/g, "const [hsnCodes, setHsnCodes] = useState<MasterHsnCode[]>");
content = content.replace(/const \[glAccounts, setGlAccounts\] = useState<any\[\]>/g, "const [glAccounts, setGlAccounts] = useState<MasterGlAccount[]>");
content = content.replace(/const \[materials, setMaterials\] = useState<any\[\]>/g, "const [materials, setMaterials] = useState<MasterMaterial[]>");
content = content.replace(/const \[categories, setCategories\] = useState<any\[\]>/g, "const [categories, setCategories] = useState<MasterCategory[]>");
content = content.replace(/const \[subCategories, setSubCategories\] = useState<any\[\]>/g, "const [subCategories, setSubCategories] = useState<MasterSubCategory[]>");
content = content.replace(/const \[mappings, setMappings\] = useState<any\[\]>/g, "const [mappings, setMappings] = useState<MasterMapping[]>");
content = content.replace(/const \[packingUnits, setPackingUnits\] = useState<any\[\]>/g, "const [packingUnits, setPackingUnits] = useState<MasterPackingUnit[]>");
content = content.replace(/const \[measurementUnits, setMeasurementUnits\] = useState<any\[\]>/g, "const [measurementUnits, setMeasurementUnits] = useState<MasterMeasurementUnit[]>");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Dashboard types injected.');
