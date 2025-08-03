(() => {
  console.log('🏠 Real Estate ROI Extension: Content script loaded on', window.location.href);
  console.log('🏠 Page title:', document.title);
  console.log('🏠 Total elements on page:', document.querySelectorAll('*').length);
  
  const extractData = async () => {
    console.log('🏠 Starting data extraction...');
    
    // Simple test - let's see what's actually on the page
    const allElements = document.querySelectorAll('*');
    console.log('🏠 Page has', allElements.length, 'elements');
    
    // Find elements with dollar signs
    const dollarElements = [...allElements].filter(el => {
      const text = el.textContent || '';
      return /\$/.test(text) && text.length < 100;
    });
    console.log('🏠 Found', dollarElements.length, 'elements with dollar signs');
    
    // Log first 10 dollar elements for debugging
    dollarElements.slice(0, 10).forEach((el, i) => {
      console.log(`🏠 Dollar element ${i+1}:`, el.textContent?.trim(), el.tagName, el.className);
    });
    
    // Try multiple selectors for price (Redfin and Zillow)
    let priceEl = document.querySelector('[data-rf-test-id="abp-price"]'); // Redfin
    console.log('🏠 Redfin price element:', priceEl);
    
    if (!priceEl) {
      priceEl = document.querySelector('[data-testid="price"]'); // Zillow
      console.log('🏠 Zillow price element (data-testid="price"):', priceEl);
    }
    if (!priceEl) {
      priceEl = document.querySelector('.notranslate'); // Zillow price
      console.log('🏠 Zillow price element (.notranslate):', priceEl);
    }
    
    // Try to find the main price in a much simpler way
    if (!priceEl) {
      // Look for large dollar amounts that are likely the main price
      priceEl = dollarElements.find(el => {
        const text = el.textContent?.trim() || '';
        const amount = text.match(/\$[\d,]+/);
        if (amount) {
          const numericValue = parseInt(amount[0].replace(/[^\d]/g, ''));
          // Property prices are usually $100k+
          return numericValue >= 100000;
        }
        return false;
      });
      console.log('🏠 Found price via large amount search:', priceEl, priceEl?.textContent);
    }
    
    console.log('🏠 Final price element:', priceEl, 'Text:', priceEl?.textContent);

    // Try multiple approaches for tax detection
    console.log('🏠 Starting tax detection...');
    
    let taxText = null;
    
    // Method 1: Look for "Property taxes $XXX" pattern in mortgage calculators (most reliable)
    const mortgageElements = [...document.querySelectorAll('*')].filter(el => {
      const text = el.textContent || '';
      return /property\s*taxes\s*\$[\d,]+/i.test(text) && text.length < 500;
    });
    
    for (let el of mortgageElements) {
      const text = el.textContent;
      const taxMatch = text.match(/property\s*taxes\s*\$[\d,]+/i);
      if (taxMatch) {
        const taxAmount = taxMatch[0].match(/\$[\d,]+/)[0];
        const monthlyTax = parseInt(taxAmount.replace(/[^\d]/g, ''));
        const annualTax = monthlyTax * 12;
        taxText = '$' + annualTax.toLocaleString();
        console.log('🏠 Found property taxes in mortgage calculator:', taxAmount, 'monthly, converted to annual:', taxText);
        break;
      }
    }
    
    // Method 2: Look for tax data in tables (Redfin tax history if available)
    if (!taxText) {
      const taxCells = [...document.querySelectorAll('td, th')].filter(cell => {
        const text = cell.textContent || '';
        return /property\s*tax/i.test(text);
      });
      
      for (let cell of taxCells) {
        const row = cell.closest('tr');
        if (row) {
          const rowCells = [...row.querySelectorAll('td, th')];
          
          // Look for tax data in subsequent rows if this is a header
          const table = row.closest('table');
          if (table) {
            const allRows = [...table.querySelectorAll('tr')];
            const headerRowIndex = allRows.indexOf(row);
            
            for (let rowIndex = headerRowIndex + 1; rowIndex < allRows.length; rowIndex++) {
              const dataRow = allRows[rowIndex];
              const dataCells = [...dataRow.querySelectorAll('td, th')];
              
              const taxColumnIndex = rowCells.findIndex(cell => 
                /property\s*tax/i.test(cell.textContent?.trim() || '')
              );
              
              if (taxColumnIndex >= 0 && taxColumnIndex < dataCells.length) {
                const taxCell = dataCells[taxColumnIndex];
                const taxCellText = taxCell.textContent?.trim() || '';
                const dollarMatch = taxCellText.match(/\$[\d,]+/);
                if (dollarMatch) {
                  const amount = parseInt(dollarMatch[0].replace(/[^\d]/g, ''));
                  if (amount < 50000) {
                    taxText = dollarMatch[0];
                    console.log('🏠 Found tax amount in tax history table:', taxText);
                    break;
                  }
                }
              }
            }
          }
        }
        if (taxText) break;
      }
    }
    
    // Method 3: Zillow-specific selectors
    if (!taxText && window.location.hostname.includes('zillow.com')) {
      const zillowSelectors = [
        '[data-testid*="tax"]',
        '.ds-home-fact-list span',
        '.hdp-fact-ataglance-value'
      ];
      
      for (let selector of zillowSelectors) {
        const elements = document.querySelectorAll(selector);
        for (let el of elements) {
          const text = el.textContent || '';
          if (/tax/i.test(text) && /\$[\d,]+/.test(text)) {
            const match = text.match(/\$[\d,]+/);
            if (match) {
              taxText = match[0];
              console.log('🏠 Found tax via Zillow selector:', taxText);
              break;
            }
          }
        }
        if (taxText) break;
      }
    }

    const price = priceEl?.innerText || priceEl?.textContent ? 
      (() => {
        const text = priceEl.innerText || priceEl.textContent;
        console.log('🏠 Raw price text:', text);
        // Extract just the first dollar amount (the main price)
        const match = text.match(/\$[\d,]+/);
        if (match) {
          const cleanPrice = parseInt(match[0].replace(/[^\d]/g, ''));
          console.log('🏠 Extracted price:', cleanPrice);
          return cleanPrice;
        }
        return null;
      })() : null;
    
    const annualTax = taxText ? 
      parseInt(taxText.replace(/[^\d]/g, '')) : null;

    console.log('🏠 Final extraction results:', { price, annualTax });

    return { price, annualTax };
  };

  // Send message only when popup asks for it
  chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    console.log('Real Estate ROI Extension: Received message', req);
    
    if (req.type === "getListingData") {
      extractData().then(data => {
        console.log('Real Estate ROI Extension: Sending response', data);
        sendResponse(data);
      }).catch(error => {
        console.error('Real Estate ROI Extension: Error extracting data:', error);
        sendResponse({ price: null, annualTax: null });
      });
      return true; // Will respond asynchronously
    }
  });
  
  console.log('Real Estate ROI Extension: Message listener registered');
})();
