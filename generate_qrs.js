import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import { PRODUCTS, SLUG_TO_BRAND } from './src/productsData.js';

const domain = 'https://rk-liart-nine.vercel.app';
const outputDir = path.join(process.cwd(), 'qr code');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateQRPDFs() {
  for (const product of PRODUCTS) {
    // Generate the slug the same way as productsData.js
    const slug = product.brand.replace(/ /g, '-');
    const url = `${domain}/${slug}`;
    const safeBrandName = product.brand.replace(/[/\\?%*:|"<>]/g, '-'); // Sanitize filename
    const pdfPath = path.join(outputDir, `${safeBrandName}.pdf`);

    try {
      // 1. Generate QR Code as Data URI (PNG)
      const qrDataURI = await QRCode.toDataURL(url, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      // Convert Data URI to Buffer
      const base64Data = qrDataURI.replace(/^data:image\/png;base64,/, "");
      const qrBuffer = Buffer.from(base64Data, 'base64');

      // 2. Create PDF
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      // Add Title
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .text(`${product.brand}`, { align: 'center' });
      
      doc.moveDown(1);
      
      doc.fontSize(12)
         .font('Helvetica')
         .text(`Scan the QR code below to view the product page:`, { align: 'center' });
      
      doc.moveDown(2);

      // Add QR Code image to PDF
      // Center the 400x400 image on A4 (595 x 842)
      doc.image(qrBuffer, (595 - 400) / 2, doc.y, { width: 400 });

      doc.moveDown(20);

      doc.fontSize(10)
         .fillColor('blue')
         .text(url, { align: 'center', link: url });

      doc.end();

      await new Promise((resolve) => stream.on('finish', resolve));
      console.log(`Created PDF for ${product.brand} -> ${pdfPath}`);
    } catch (error) {
      console.error(`Error generating PDF for ${product.brand}:`, error);
    }
  }
}

generateQRPDFs().then(() => {
  console.log('All QR code PDFs generated successfully!');
}).catch(console.error);
