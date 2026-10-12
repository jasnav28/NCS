import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import { PRODUCTS } from './src/productsData.js';

const domain = 'https://ncs-lilac.vercel.app';
const outputDir = path.join(process.cwd(), 'qr_codes');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateQRPDFs() {
  console.log(`Generating QR Code PDFs for ${PRODUCTS.length} products...`);

  for (let i = 0; i < PRODUCTS.length; i++) {
    const product = PRODUCTS[i];
    const slug = product.slug || product.brand.replace(/[,_/+\s]+/g, '-').replace(/-+/g, '-').trim();
    const url = `${domain}/${slug}`;
    const safeBrandName = product.brand.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, ' ').trim();
    const pdfPath = path.join(outputDir, `${safeBrandName}.pdf`);

    try {
      // 1. Generate QR Code as Data URI (PNG)
      const qrDataURI = await QRCode.toDataURL(url, {
        width: 380,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      // Convert Data URI to Buffer
      const base64Data = qrDataURI.replace(/^data:image\/png;base64,/, "");
      const qrBuffer = Buffer.from(base64Data, 'base64');

      // 2. Create PDF (A4 size: 595.28 x 841.89 pt)
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      // Title
      doc.fontSize(22)
         .font('Helvetica-Bold')
         .fillColor('#111827')
         .text(product.displayName || product.brand, { align: 'center' });
      
      doc.moveDown(0.5);

      // Category & Specification
      if (product.specification) {
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#374151')
           .text(product.specification, { align: 'center' });
      }

      if (product.category) {
        doc.moveDown(0.2);
        doc.fontSize(10)
           .font('Helvetica-Oblique')
           .fillColor('#6B7280')
           .text(`(${product.category})`, { align: 'center' });
      }
      
      doc.moveDown(1);
      
      doc.fontSize(11)
         .font('Helvetica')
         .fillColor('#4B5563')
         .text('Scan the QR code below to view the official product registration page:', { align: 'center' });
      
      doc.moveDown(1);

      // Center the 380x380 QR Code on A4 width (595.28)
      const qrX = (595.28 - 380) / 2;
      doc.image(qrBuffer, qrX, doc.y, { width: 380 });

      doc.y += 390;

      // Link text
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .fillColor('#2563EB')
         .text(url, { align: 'center', link: url });

      doc.end();

      await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      console.log(`[${i + 1}/${PRODUCTS.length}] Created: ${safeBrandName}.pdf`);
    } catch (error) {
      console.error(`Error generating PDF for ${product.brand}:`, error);
    }
  }
}

generateQRPDFs().then(() => {
  console.log(`\nSuccessfully generated all ${PRODUCTS.length} QR code PDFs in: ${outputDir}`);
}).catch(console.error);
