import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir =
  "C:\\Users\\NGUYEN MINH TRI\\OneDrive\\Desktop\\MyClass\\outputs\\student-upload-test-20260505";
const outputPath = path.join(outputDir, "danh-sach-hoc-sinh-test-upload.xlsx");
const previewPath = path.join(outputDir, "danh-sach-hoc-sinh-test-upload.png");

await fs.mkdir(outputDir, { recursive: true });

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("DanhSachHocSinh");

const rows = [
  ["MSSV", "Ho va ten"],
  ["20240001", "Nguyen Van An"],
  ["20240002", "Tran Thi Bich"],
  ["20240003", "Le Minh Chau"],
  ["20240004", "Pham Gia Han"],
  ["20240005", "Do Quang Huy"],
  ["20240006", "Vo Thanh Lam"],
  ["20240007", "Bui Ngoc Mai"],
  ["20240008", "Dang Tuan Nam"],
  ["20240009", "Hoang Gia Phuc"],
  ["20240010", "Phan Bao Tram"],
  ["20240011", "Ngo Hai Yen"],
  ["20240012", "Duong Khac Viet"],
];

sheet.getRange(`A1:B${rows.length}`).values = rows;
sheet.getRange("A1:B1").format = {
  fill: "#1D4ED8",
  font: { bold: true, color: "#FFFFFF" },
};
sheet.getRange(`A2:A${rows.length}`).format.numberFormat = "@";
sheet.getRange(`A1:B${rows.length}`).format = {
  ...sheet.getRange(`A1:B${rows.length}`).format,
  borders: {
    bottom: { style: "thin", color: "#CBD5E1" },
    top: { style: "thin", color: "#CBD5E1" },
    left: { style: "thin", color: "#CBD5E1" },
    right: { style: "thin", color: "#CBD5E1" },
    insideHorizontal: { style: "thin", color: "#E2E8F0" },
    insideVertical: { style: "thin", color: "#E2E8F0" },
  },
};
sheet.getRange("A:A").format.columnWidthPx = 120;
sheet.getRange("B:B").format.columnWidthPx = 220;
sheet.freezePanes.freezeRows(1);

const inspection = await workbook.inspect({
  kind: "table",
  range: `DanhSachHocSinh!A1:B${rows.length}`,
  include: "values",
  tableMaxRows: 20,
  tableMaxCols: 4,
});

console.log(inspection.ndjson);

const preview = await workbook.render({
  sheetName: "DanhSachHocSinh",
  range: `A1:B${rows.length}`,
  autoCrop: "all",
  scale: 2,
  format: "png",
});

await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);

console.log(outputPath);
