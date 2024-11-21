const vision = require('@google-cloud/vision');

async function extractDataFromImage(filePath) {
    const client = new vision.ImageAnnotatorClient();
    const [result] = await client.documentTextDetection(filePath);
    const fullTextAnnotation = result.fullTextAnnotation.text;

    // Process text to extract key details
    return parseInvoiceData(fullTextAnnotation);
}

function parseInvoiceData(text) {
    // Example: Extracting invoice details using regex
    const invoiceNumberMatch = text.match(/Invoice #:\s*(\S+)/i);
    const invoiceDateMatch = text.match(/Invoice Date:\s*([\d\w\s]+)/i);
    const gstinMatch = text.match(/GSTIN:\s*([\w\d]+)/i);

    return {
        invoiceNumber: invoiceNumberMatch ? invoiceNumberMatch[1] : '',
        invoiceDate: invoiceDateMatch ? invoiceDateMatch[1] : '',
        gstin: gstinMatch ? gstinMatch[1] : '',
    };
}

module.exports = { extractDataFromImage };
