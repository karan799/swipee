require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAIFileManager } = require('@google/generative-ai/server');

const xlsx = require('xlsx');
const PDFDocument = require('pdfkit');



// Initialize Google API clients
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const fileManager = new GoogleAIFileManager(process.env.API_KEY);

// Create an Express application
const app = express();
app.use(express.json());
app.use(cors());

// File Upload Configuration
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const checkFileType = (file) => {
  const validMimeTypes = ['image/jpeg', 'application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];  // JPG, PDF, and XLSX
  return validMimeTypes.includes(file.mimetype);
};

// Function to convert Excel to PDF
const convertExcelToPDF = (fileBuffer, outputPath) => {
  const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = xlsx.utils.sheet_to_json(worksheet);

  const doc = new PDFDocument();
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  // Add content to PDF
  doc.fontSize(16).text('Excel to PDF Conversion', { align: 'center' });
  doc.moveDown();
  jsonData.forEach((row, index) => {
    doc.fontSize(12).text(`${index + 1}. ${JSON.stringify(row)}`);
    doc.moveDown(0.5);
  });

  doc.end();
  return new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
};



// Endpoint to handle file upload
app.post('/upload', upload.single('file'), async (req, res) => {
  
  try {
    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname;
    const tempDir = path.join(__dirname, 'uploads');

    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    let processedFilePath = path.join(tempDir, fileName);

    if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      // Convert Excel file to PDF
      const pdfFilePath = path.join(tempDir, fileName.replace(/\.xlsx$/, '.pdf'));
      req.file.mimetype="application/pdf";
      await convertExcelToPDF(fileBuffer, pdfFilePath);
      processedFilePath = pdfFilePath;
    } else {
      // Save other file types as-is
      fs.writeFileSync(processedFilePath, fileBuffer);
    }
    console.log(req.file.mimetype);
    // Upload file to Google AI File Manager
    const uploadResponse = await fileManager.uploadFile(processedFilePath, {

      mimeType: req.file.mimetype,
      displayName: fileName,
    });

    console.log(`Uploaded file ${uploadResponse.file.displayName} as: ${uploadResponse.file.uri}`);

    // Generate content using the uploaded file
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent([
      {
        fileData: {
          mimeType: uploadResponse.file.mimeType,
          fileUri: uploadResponse.file.uri,
        },
      },
      { text: `Input Description: I have files of varying formats containing transaction details. These files could include:

      Excel files with fields like serial number, net/total amount, customer information, etc.
      PDF or image files that include invoices containing customer details, item details, total amounts, taxes, and so on. Analyze the provided input file (Excel, PDF, or image).
      Extract the following:
      Invoice Details: Number, date, supplier, consignee, GSTINs, place of supply, and total amount.
      Product Information: Name,customerName(who buyed that product), quantity, unit price, and total for each product.
      Customer Details: customerName, company, GSTIN, and phone/mobile/contact number.
      Ignore unrelated or incomplete information.
      Output only a properly formatted JSON string as shown in the format above. 
      Can you summarize the invoice details, product info, and customer details? in output i only want a json string in this format so that i can use json.parse to convert your response text into object {
        "invoiceSummary": {
          "invoiceNumber": "INV-148CZS",
          "invoiceDate": "November 12, 2024",
          "supplier": "Elnvoices",
          "supplierGSTIN": "29AABCT1332L000",
          "consignee": "Shounak",
          "consigneeCompany": "NextSpeed Technologies Pvt Ltd",
          "consigneeGSTIN": "ABCDE1234567890",
          "placeOfSupply": "29-KARNATAKA",
          "totalAmount": "₹2,05,481.00"
        },
        "products": [
          {
            "name": "GEMS Chocolate Pouch",
            "customerName":"shounak",
            "quantity": 1000,
            "unitPrice": "₹4.7619",
            "tax:"10",
            "total": "₹5,000.00"
          },
          {
            "name": "TREAT BKS Case (80 packets)",
            "customerName":"shounak",
            "quantity": 50,
            "unitPrice": "₹535.7143",
            "tax:"10",
            "total": "₹30,000.00"
          },
          {
            "name": "Nutri Choice BKS Case",
            "customerName":"shounak",
            "quantity": 25,
            "unitPrice": "₹666.6667",
            "tax:"10",
            "total": "₹17,500.00"
          },
          {
            "name": "Milk Bikis Classic Case (120 packets)",
            "customerName":"shounak",
            "quantity": 20,
            "unitPrice": "₹809.5238",
            "tax:"10",
            "total": "₹17,000.00"
          }
        ],
        "customerDetails":[ {
          "customerName": "Shounak",
          "company": "NextSpeed Technologies Pvt Ltd",
          "gstin": "ABCDE1234567890",
          "invoiceNumber": "INV-148CZS",
          "invoiceDate": "November 12, 2024",
          "supplier": "Elnvoices",
          "supplierGSTIN": "29AABCT1332L000",
          "consignee": "Shounak",
          "consigneeCompany": "NextSpeed Technologies Pvt Ltd",
          "consigneeGSTIN": "ABCDE1234567890",
          "placeOfSupply": "29-KARNATAKA",
          "mobile": "9999999994"
        }]
      }
      ` },
    ]);

    // Process the result to organize data into tabs
    const content = result.response.text();
    console.log(content)
    const jsonMatch = content.match(/{[\s\S]*}/);
    const contentObj=JSON.parse(jsonMatch)
    console.log(contentObj)
    // const extractedData = processInvoiceContent(content);

    // Clean up the temporary file after processing
    fs.unlinkSync(processedFilePath);

    res.status(200).json(contentObj);

  } catch (error) {
    console.error(error);
    res.status(500).send('Error processing the file');
  }
});

// Function to process and organize extracted content into invoice, products, and customers
function processInvoiceContent(content) {
  const invoiceTab = extractInvoiceDetails(content);
  const productsTab = extractProductDetails(content);
  const customersTab = extractCustomerDetails(content);

  return {
    invoice: invoiceTab,
    products: productsTab,
    customers: customersTab,
  };
}

function extractInvoiceDetails(content) {
    const invoiceDetails = {};
  
    // Example parsing logic for Invoice Number
    const invoiceMatch = content.match(/Invoice Number: (\d+)/);
    if (invoiceMatch) {
      invoiceDetails.invoiceNumber = invoiceMatch[1];
    } else {
      invoiceDetails.invoiceNumber = "Not Found";
    }
  
    return invoiceDetails;
  }
  

function extractProductDetails(content) {
  // Logic to extract product details
  const products = [];
  // Example parsing logic
  const productMatches = content.match(/Product Name: (.*?)(?:\n|$)/g);
  if (productMatches) {
    productMatches.forEach((product) => {
      products.push({ productName: product.replace('Product Name: ', '').trim() });
    });
  }
  return products;
}

function extractCustomerDetails(content) {
  // Logic to extract customer details
  const customerDetails = {};
  if (content.includes('Customer Name')) {
    customerDetails.name = content.match(/Customer Name: (.*?)(?:\n|$)/)[1];
  }
  if (content.includes('Customer Email')) {
    customerDetails.email = content.match(/Customer Email: (.*?)(?:\n|$)/)[1];
  }
  return customerDetails;
}

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
