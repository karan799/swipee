console.log(JSON.parse( `{
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
        "quantity": 1000,
        "unitPrice": "₹4.7619",
        "total": "₹5,000.00"
      },
      {
        "name": "TREAT BKS Case (80 packets)",
        "quantity": 50,
        "unitPrice": "₹535.7143",
        "total": "₹30,000.00"
      },
      {
        "name": "Nutri Choice BKS Case",
        "quantity": 25,
        "unitPrice": "₹666.6667",
        "total": "₹17,500.00"
      },
      {
        "name": "Milk Bikis Classic Case (120 packets)",
        "quantity": 20,
        "unitPrice": "₹809.5238",
        "total": "₹17,000.00"
      }
    ],
    "customerDetails": {
      "name": "Shounak",
      "company": "NextSpeed Technologies Pvt Ltd",
      "gstin": "ABCDE1234567890",
      "phone": "9999999994"
    }
  }
  `))
