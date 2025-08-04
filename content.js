// Optimized content script for property data extraction
console.log('🏠 Real Estate ROI Extension: Content script loaded');

// Enhanced data extraction with multiple fallback strategies
function extractPropertyData() {
  console.log('🏠 Starting property data extraction...');
  
  let price = null;
  let annualTax = null;
  
  // Determine which site we're on
  const isRedfin = window.location.hostname.includes('redfin.com');
  const isZillow = window.location.hostname.includes('zillow.com');
  
  console.log('🏠 Site detection:', { isRedfin, isZillow });
  
  if (isRedfin) {
    // Redfin price extraction with multiple selectors
    const redfinPriceSelectors = [
      '.price-section .statsValue',
      '.price .value',
      '.current-price .price-text',
      '.home-price',
      '.price-display',
      '[data-rf-test-id="abp-price"]'
    ];
    
    for (const selector of redfinPriceSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const priceText = element.textContent || element.innerText;
        console.log('🏠 Found price element:', selector, priceText);
        price = extractNumericValue(priceText);
        if (price) break;
      }
    }
    
    // Redfin tax extraction
    const redfinTaxSelectors = [
      '[data-rf-test-id="abp-taxHistory"] .value',
      '.tax-history .value',
      '.property-taxes .value',
      '.tax-amount'
    ];
    
    for (const selector of redfinTaxSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const taxText = element.textContent || element.innerText;
        console.log('🏠 Found tax element:', selector, taxText);
        let taxValue = extractNumericValue(taxText);
        if (taxValue) {
          // Check if this looks like a monthly amount (typically under $1000 for most properties)
          // Convert monthly to annual if needed
          if (taxValue < 1200) {
            console.log('🏠 Converting monthly tax to annual:', taxValue, '→', taxValue * 12);
            taxValue = taxValue * 12;
          }
          annualTax = taxValue;
          break;
        }
      }
    }
    
    // Fallback: Look for tax info in body text
    if (!annualTax) {
      const bodyText = document.body?.innerText;
      if (bodyText) {
        const taxPattern = /(?:Annual|Yearly)?\s*(?:Property\s+)?Tax(?:es)?:?\s*\$?([\d,]+)/i;
        const taxMatch = bodyText.match(taxPattern);
        if (taxMatch) {
          console.log('🏠 Found tax in body text:', taxMatch[0]);
          let taxValue = extractNumericValue(taxMatch[1]);
          if (taxValue && taxValue < 1200) {
            console.log('🏠 Converting monthly tax from body text to annual:', taxValue, '→', taxValue * 12);
            taxValue = taxValue * 12;
          }
          annualTax = taxValue;
        }
      }
    }
    
  } else if (isZillow) {
    // Zillow price extraction
    const zillowPriceSelectors = [
      '[data-testid="price"]',
      '.notranslate .Text-c11n-8-84-3__sc-aiai24-0',
      '.summary-container .notranslate',
      '.price-range',
      '.ds-price .ds-text'
    ];
    
    for (const selector of zillowPriceSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const priceText = element.textContent || element.innerText;
        console.log('🏠 Found price element:', selector, priceText);
        price = extractNumericValue(priceText);
        if (price) break;
      }
    }
    
    
    // Enhanced Zillow tax extraction - prioritize tax history over monthly payment calculations
    console.log('🏠 Starting Zillow tax extraction...');
    
    // Method 1: Try to find the most recent year in tax history table
    const tryExtractFromTaxTable = () => {
      console.log('🏠 Looking for Zillow tax history table...');
      
      // Look for tax history tables or sections
      const tableSelectors = [
        '[data-testid="tax-history-table"]',
        '.tax-history-table',
        '.tax-history',
        '[data-testid="tax-history"]'
      ];
      
      // Also look for any element containing "Public tax history"
      const publicTaxElements = document.querySelectorAll('*');
      for (const element of publicTaxElements) {
        const text = element.textContent || element.innerText;
        if (text.includes('Public tax history')) {
          console.log('🏠 Found "Public tax history" section');
          // Look for table rows within this section
          const parent = element.closest('section, div, [class*="section"]') || element.parentElement;
          if (parent) {
            // Look for table structure with Year | Property taxes | Tax assessment
            const rows = parent.querySelectorAll('tr, [role="row"], [class*="row"]');
            let mostRecentTax = null;
            let mostRecentYear = 0;
            
            for (const row of rows) {
              const rowText = (row.textContent || row.innerText) || '';
              console.log('🏠 Checking tax history row:', rowText);
              
              // Look for year pattern (2024, 2023, etc.)
              const yearMatch = rowText.match(/20\d{2}/);
              if (yearMatch) {
                const year = parseInt(yearMatch[0]);
                // Look for property tax amount in same row (format: $5,556 +19.1%)
                const taxMatch = rowText.match(/\$([0-9,]+)/g);
                if (taxMatch && taxMatch.length > 0) {
                  // Get the first tax amount (property taxes column)
                  const taxAmount = extractNumericValue(taxMatch[0]);
                  if (taxAmount && taxAmount > 500) {
                    console.log(`🏠 Found tax for year ${year}: $${taxAmount}`);
                    if (year > mostRecentYear) {
                      mostRecentYear = year;
                      mostRecentTax = taxAmount;
                    }
                  }
                }
              }
            }
            
            if (mostRecentTax) {
              console.log(`🏠 ✅ Most recent tax from Public tax history: ${mostRecentYear} = $${mostRecentTax}`);
              return mostRecentTax;
            }
          }
        }
      }
      
      // Fallback to original table detection
      for (const selector of tableSelectors) {
        const table = document.querySelector(selector);
        if (table) {
          console.log('🏠 Found tax table:', selector);
          
          // Look for the most recent year (highest number)
          const yearPattern = /20\d{2}/g;
          const taxAmountPattern = /\$?([\d,]+)/g;
          
          const tableText = (table.textContent || table.innerText) || '';
          const years = tableText.match(yearPattern);
          
          if (years && years.length > 0) {
            const mostRecentYear = Math.max(...years.map(y => parseInt(y)));
            console.log('🏠 Most recent tax year found:', mostRecentYear);
            
            // Try to find tax amount for the most recent year
            const rows = table.querySelectorAll('tr, .tax-year-row, .ds-data-col');
            for (const row of rows) {
              const rowText = (row.textContent || row.innerText) || '';
              if (rowText.includes(mostRecentYear.toString())) {
                console.log('🏠 Found recent year row:', rowText);
                const taxMatches = rowText.match(/\$?([\d,]+)/g);
                if (taxMatches && taxMatches.length > 0) {
                  // Get the largest number in the row (likely the tax amount)
                  const amounts = taxMatches.map(m => extractNumericValue(m)).filter(a => a && a > 500);
                  if (amounts.length > 0) {
                    const taxAmount = Math.max(...amounts);
                    console.log('🏠 ✅ Tax from recent year row:', taxAmount);
                    return taxAmount;
                  }
                }
              }
            }
          }
        }
      }
      return null;
    };
    
    // Method 1.5: Try newer Zillow tax selectors first
    if (!annualTax) {
      console.log('🏠 Trying enhanced Zillow tax selectors...');
      const enhancedZillowSelectors = [
        // Modern Zillow tax history selectors
        '[data-testid="property-tax-history"] .Text-c11n-8-84-3__sc-aiai24-0',
        '[data-testid="tax-assessments"] .Text-c11n-8-84-3__sc-aiai24-0',
        '.PropertyTaxes-c11n-8-84-3__sc-1l1c55w-0 .Text-c11n-8-84-3__sc-aiai24-0',
        
        // Tax fact section
        '[aria-label*="tax" i] .Text-c11n-8-84-3__sc-aiai24-0',
        '[data-testid*="tax" i] .Text-c11n-8-84-3__sc-aiai24-0',
        
        // Property details tax rows
        'dt:contains("Tax") + dd',
        '.fact-row:contains("Tax") .fact-value',
        
        // Tax history in tables - more specific
        '.tax-history-container .Text-c11n-8-84-3__sc-aiai24-0',
        '.property-tax-container .Text-c11n-8-84-3__sc-aiai24-0'
      ];
      
      for (const selector of enhancedZillowSelectors) {
        try {
          console.log('🏠 Trying enhanced selector:', selector);
          const element = document.querySelector(selector);
          if (element) {
            const taxText = element.textContent || element.innerText;
            console.log('🏠 Found enhanced element:', selector, taxText);
            let taxValue = extractNumericValue(taxText);
            if (taxValue && isValidTaxAmount(taxValue)) {
              // Convert monthly to annual if needed
              if (taxValue < 1200) {
                console.log('🏠 Converting monthly tax to annual:', taxValue, '→', taxValue * 12);
                taxValue = taxValue * 12;
              }
              annualTax = taxValue;
              console.log('🏠 ✅ Tax from enhanced selector:', annualTax);
              break;
            }
          }
        } catch (e) {
          console.log('🏠 Enhanced selector error:', e);
        }
      }
    }
    
    // Try tax table extraction first
    annualTax = tryExtractFromTaxTable();
    
    // Method 2: Look for tax history section specifically with enhanced selectors
    if (!annualTax) {
      console.log('🏠 Method 2: Enhanced tax history selectors...');
      const zillowTaxHistorySelectors = [
        // Primary tax history selectors
        '[data-testid="tax-history-table"] tr:first-child td:last-child',
        '[data-testid="tax-history"] .ds-text',
        '.tax-history-table tr:first-child td:last-child',
        
        // Tax assessment and evaluation selectors  
        '[data-testid="property-tax-assessments"] .Text-c11n-8-84-3__sc-aiai24-0',
        '[data-testid="tax-assessment"] .Text-c11n-8-84-3__sc-aiai24-0',
        
        // Public records tax information
        '.public-records-tax .Text-c11n-8-84-3__sc-aiai24-0',
        '[aria-label*="property tax" i] .Text-c11n-8-84-3__sc-aiai24-0',
        
        // Property facts section
        '[data-testid="property-details-tax-info"] .Text-c11n-8-84-3__sc-aiai24-0',
        '.property-details-tax .ds-text',
        
        // Facts and features section
        '.property-facts .tax-amount',
        
        // Overview section tax info
        '.property-overview .tax-info .ds-text'
      ];
      
      for (const selector of zillowTaxHistorySelectors) {
        console.log('🏠 Trying tax history selector:', selector);
        try {
          const element = document.querySelector(selector);
          if (element) {
            const taxText = element.textContent || element.innerText;
            console.log('🏠 Found tax history element:', selector, taxText);
            let taxValue = extractNumericValue(taxText);
            if (taxValue && isValidTaxAmount(taxValue)) {
              // If it's clearly an annual amount (typically > $1200), use as is
              // If it looks monthly (< $1200), convert to annual
              if (taxValue < 1200) {
                console.log('🏠 Converting monthly tax to annual:', taxValue, '→', taxValue * 12);
                taxValue = taxValue * 12;
              }
              annualTax = taxValue;
              console.log('🏠 ✅ Tax from history section:', annualTax);
              break;
            }
          }
        } catch (e) {
          console.log('🏠 Selector error:', selector, e);
        }
      }
    }
    
    // Method 2.3: Look specifically for property assessment data
    if (!annualTax) {
      console.log('🏠 Method 2.3: Looking for property assessment data...');
      
      // Search for text patterns that indicate tax assessments
      const assessmentPatterns = [
        /property\s+tax[:\s]*\$?([\d,]+)/gi,
        /annual\s+tax[:\s]*\$?([\d,]+)/gi,
        /tax\s+assessment[:\s]*\$?([\d,]+)/gi,
        /assessed\s+tax[:\s]*\$?([\d,]+)/gi,
        /county\s+tax[:\s]*\$?([\d,]+)/gi
      ];
      
      // Get page text but exclude payment calculator sections
      const pageText = (document.body?.textContent || document.body?.innerText) || '';
      const excludePattern = /(monthly\s+payment|mortgage\s+payment|estimated\s+monthly)/gi;
      
      // Split into sections and exclude payment-related sections
      const sections = pageText.split(/\n\s*\n/);
      
      for (const section of sections) {
        if (!excludePattern.test(section)) {
          for (const pattern of assessmentPatterns) {
            const matches = [...section.matchAll(pattern)];
            for (const match of matches) {
              const taxValue = extractNumericValue(match[1]);
              if (taxValue && isValidTaxAmount(taxValue)) {
                console.log('🏠 Found tax from assessment pattern:', match[0], '→', taxValue);
                annualTax = taxValue > 1200 ? taxValue : taxValue * 12;
                console.log('🏠 ✅ Tax from assessment pattern:', annualTax);
                break;
              }
            }
            if (annualTax) break;
          }
        }
        if (annualTax) break;
      }
    }
    
    // Method 2.5: Search for tax information in tables using JavaScript
    if (!annualTax) {
      console.log('🏠 Searching for tax information in tables...');
      const tables = document.querySelectorAll('table, .facts-table, .property-facts, [class*="table"]');
      
      for (const table of tables) {
        // First, look for Zillow's specific "Property taxes" column structure
        const tableText = (table.textContent || table.innerText) || '';
        if (tableText.includes('Property taxes') && tableText.includes('Year')) {
          console.log('🏠 Found table with "Property taxes" column header');
          
          // Find the header row and locate column positions
          const rows = table.querySelectorAll('tr, [role="row"]');
          let propertyTaxColumnIndex = -1;
          let headerRow = null;
          
          // Find the header row and property tax column index
          for (const row of rows) {
            const cells = row.querySelectorAll('td, th, [role="cell"], [role="columnheader"]');
            for (let i = 0; i < cells.length; i++) {
              const cellText = ((cells[i].textContent || cells[i].innerText) || '').toLowerCase();
              if (cellText.includes('property tax')) {
                propertyTaxColumnIndex = i;
                headerRow = row;
                console.log('🏠 Found "Property taxes" column at index:', i);
                break;
              }
            }
            if (propertyTaxColumnIndex >= 0) break;
          }
          
          // Extract tax values from the property tax column
          if (propertyTaxColumnIndex >= 0) {
            let mostRecentTax = null;
            let mostRecentYear = 0;
            
            for (const row of rows) {
              if (row === headerRow) continue; // Skip header row
              
              const cells = row.querySelectorAll('td, th, [role="cell"]');
              if (cells.length > propertyTaxColumnIndex) {
                const yearCell = cells[0]; // First column should be year
                const taxCell = cells[propertyTaxColumnIndex];
                
                const yearText = (yearCell.textContent || yearCell.innerText) || '';
                const taxText = (taxCell.textContent || taxCell.innerText) || '';
                
                const yearMatch = yearText.match(/20\d{2}/);
                if (yearMatch) {
                  const year = parseInt(yearMatch[0]);
                  const taxAmount = extractNumericValue(taxText);
                  
                  if (taxAmount && taxAmount > 500) {
                    console.log(`🏠 Found tax for year ${year}: $${taxAmount} from "${taxText}"`);
                    if (year > mostRecentYear) {
                      mostRecentYear = year;
                      mostRecentTax = taxAmount;
                    }
                  }
                }
              }
            }
            
            if (mostRecentTax) {
              annualTax = mostRecentTax;
              console.log(`🏠 ✅ Most recent tax from Property taxes column: ${mostRecentYear} = $${annualTax}`);
              break;
            }
          }
        }
        
        // Fallback to general table search if specific structure not found
        if (!annualTax) {
          const cells = table.querySelectorAll('td, th, .cell, [class*="cell"]');
          for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            const cellText = (cell.textContent || cell.innerText || '').toLowerCase();
            
            // Look for cells containing tax-related keywords
            if (cellText.includes('tax') || cellText.includes('property tax') || cellText.includes('annual tax')) {
              // Check the next cell or sibling for the tax amount
              const nextCell = cells[i + 1] || cell.nextElementSibling;
              if (nextCell) {
                const nextText = nextCell.textContent || nextCell.innerText;
                const taxValue = extractNumericValue(nextText);
                if (taxValue && taxValue > 500) {
                  console.log('🏠 Found tax in table:', cellText, '→', nextText, '=', taxValue);
                  annualTax = taxValue > 1200 ? taxValue : taxValue * 12;
                  console.log('🏠 ✅ Tax from general table search:', annualTax);
                  break;
                }
              }
            }
          }
        }
        if (annualTax) break;
      }
    }
    
    // Method 3: If no tax history found, try XPath to find tax-related content that excludes monthly payments
    if (!annualTax) {
      console.log('🏠 Trying XPath for Zillow tax extraction...');
      const taxXPaths = [
        // Look for text that says "Property tax" followed by a dollar amount
        "//text()[contains(., 'Property tax')]/following::*[contains(text(), '$')][1]",
        "//text()[contains(., 'Annual tax')]/following::*[contains(text(), '$')][1]",
        
        // Look in tax history sections specifically
        "//*[contains(@class, 'tax-history')]//text()[contains(., '$')]",
        "//*[contains(@data-testid, 'tax')]//text()[contains(., '$')]",
        
        // Look for tax amounts in property details (avoid monthly payment sections)
        "//*[contains(text(), 'Property tax')]/ancestor::*[not(contains(@class, 'payment')) and not(contains(@class, 'mortgage'))]//*[contains(text(), '$')]"
      ];
      
      for (const xpath of taxXPaths) {
        try {
          console.log('🏠 Trying tax XPath:', xpath);
          const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          if (result.singleNodeValue) {
            const taxText = (result.singleNodeValue.textContent || result.singleNodeValue.innerText) || '';
            console.log('🏠 XPath found tax text:', taxText);
            let taxValue = extractNumericValue(taxText);
            if (taxValue && taxValue > 500) {
              if (taxValue < 1200) {
                console.log('🏠 Converting monthly tax to annual:', taxValue, '→', taxValue * 12);
                taxValue = taxValue * 12;
              }
              annualTax = taxValue;
              console.log('🏠 ✅ Tax from XPath:', annualTax);
              break;
            }
          }
        } catch (e) {
          console.log('🏠 XPath error:', e);
        }
      }
    }
    
    // Method 4: Look for tax information in text content, but exclude monthly payment sections
    if (!annualTax) {
      console.log('🏠 Trying text pattern matching for Zillow taxes...');
      
      // Get all text content but exclude monthly payment calculator sections
      const excludeSelectors = [
        '[data-testid="monthly-payment"]',
        '.monthly-payment',
        '.mortgage-calculator',
        '.payment-calculator',
        '.calculator-section'
      ];
      
      // Remove excluded sections temporarily for text extraction
      const excludedElements = [];
      excludeSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          excludedElements.push({ element: el, parent: el.parentNode });
          el.parentNode.removeChild(el);
        });
      });
      
      try {
        const bodyText = document.body?.innerText || '';
        
        // Look for various tax patterns
        const taxPatterns = [
          /Property\s+tax\s*:?\s*\$?([\d,]+)\/?\s*year/i,
          /Annual\s+tax\s*:?\s*\$?([\d,]+)/i,
          /Tax\s+amount\s*:?\s*\$?([\d,]+)\/?\s*year/i,
          /Property\s+taxes?\s*:?\s*\$?([\d,]+)(?!\s*\/\s*mo)/i, // Exclude monthly
          /Tax\s*\(\d{4}\)\s*:?\s*\$?([\d,]+)/i // Tax (2023): $5,000 format
        ];
        
        for (const pattern of taxPatterns) {
          const taxMatch = bodyText.match(pattern);
          if (taxMatch) {
            console.log('🏠 Found tax pattern:', taxMatch[0]);
            let taxValue = extractNumericValue(taxMatch[1]);
            if (taxValue && taxValue > 500) {
              // Check if it's clearly marked as annual or if the amount suggests it's annual
              const isAnnual = /year|annual/i.test(taxMatch[0]) || taxValue > 1200;
              if (!isAnnual && taxValue < 1200) {
                console.log('🏠 Converting monthly tax to annual:', taxValue, '→', taxValue * 12);
                taxValue = taxValue * 12;
              }
              annualTax = taxValue;
              console.log('🏠 ✅ Tax from text pattern:', annualTax);
              break;
            }
          }
        }
      } finally {
        // Restore excluded elements
        excludedElements.forEach(({ element, parent }) => {
          parent.appendChild(element);
        });
      }
    }
    
    // Method 5: Fallback to generic selectors but with better validation
    if (!annualTax) {
      console.log('🏠 Trying fallback Zillow tax selectors...');
      const zillowFallbackTaxSelectors = [
        '[data-testid="property-tax-history"] .Text-c11n-8-84-3__sc-aiai24-0',
        '.property-tax .ds-text',
        '.tax-history .ds-text'
      ];
      
      for (const selector of zillowFallbackTaxSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const taxText = element.textContent || element.innerText;
          console.log('🏠 Found fallback tax element:', selector, taxText);
          let taxValue = extractNumericValue(taxText);
          if (taxValue && taxValue > 500) {
            // Be more conservative with monthly/annual detection
            if (taxValue < 1000) {
              console.log('🏠 Converting likely monthly tax to annual:', taxValue, '→', taxValue * 12);
              taxValue = taxValue * 12;
            }
            annualTax = taxValue;
            console.log('🏠 ⚠️ Tax from fallback (verify manually):', annualTax);
            break;
          }
        }
      }
    }
    
    // Final fallback: Look for tax info in body text with improved patterns
    if (!annualTax) {
      console.log('🏠 Trying improved body text tax extraction...');
      const bodyText = document.body?.innerText || '';
      
      // More specific patterns that are less likely to match monthly payment calculations
      const improvedTaxPatterns = [
        /Property\s+tax\s*\(?\d{4}\)?\s*:?\s*\$?([\d,]+)(?!\s*\/\s*mo)/i, // Property tax (2023): $5000 but not $/mo
        /Annual\s+(?:property\s+)?tax(?:es)?\s*:?\s*\$?([\d,]+)/i,
        /Yearly\s+(?:property\s+)?tax(?:es)?\s*:?\s*\$?([\d,]+)/i,
        /Tax\s+assessment\s*:?\s*\$?([\d,]+)/i,
        /(?:Property\s+)?Tax(?:es)?\s*\$?([\d,]+)\s*\/\s*year/i,
        /(?:Property\s+)?Tax(?:es)?\s*\$?([\d,]+)\s*annually/i
      ];
      
      for (const pattern of improvedTaxPatterns) {
        const taxMatch = bodyText.match(pattern);
        if (taxMatch) {
          console.log('🏠 Found improved tax pattern:', taxMatch[0]);
          let taxValue = extractNumericValue(taxMatch[1]);
          if (taxValue && taxValue > 300) { // Very reasonable minimum
            // These patterns are designed to catch annual amounts
            // Only convert if it's very clearly a monthly amount
            if (taxValue < 800) {
              console.log('🏠 Converting likely monthly tax to annual:', taxValue, '→', taxValue * 12);
              taxValue = taxValue * 12;
            }
            annualTax = taxValue;
            console.log('🏠 ✅ Tax from improved pattern:', annualTax);
            break;
          }
        }
      }
    }
  }
  
  // XPath fallback for both sites
  if (!price) {
    console.log('🏠 Trying XPath fallback for price...');
    const priceXPaths = [
      "//span[contains(text(), '$') and contains(@class, 'price')]",
      "//div[contains(@class, 'price') and contains(text(), '$')]",
      "//*[contains(text(), '$') and string-length(translate(text(), '$,0123456789', '')) < 5]"
    ];
    
    for (const xpath of priceXPaths) {
      try {
        const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        if (result.singleNodeValue) {
          const priceText = result.singleNodeValue.textContent;
          console.log('🏠 XPath found price:', xpath, priceText);
          price = extractNumericValue(priceText);
          if (price && price > 50000) break; // Reasonable house price check
        }
      } catch (e) {
        console.log('🏠 XPath error:', e);
      }
    }
  }
  
  // Final validation and warning system for extracted tax amount
  if (annualTax) {
    if (!isValidTaxAmount(annualTax, true)) {
      console.log('🏠 ⚠️ Warning: Extracted tax amount seems unusual:', annualTax);
      console.log('🏠 ⚠️ Please verify this amount manually against the property tax history');
      
      // If the amount is extremely high, it might be a price instead of tax
      if (annualTax > 30000) {
        console.log('🏠 ❌ Tax amount too high, likely extracted wrong value. Setting to null.');
        annualTax = null;
      }
      // If it's very low, it might be monthly
      else if (annualTax < 600 && annualTax > 50) {
        console.log('🏠 🔄 Tax amount very low, converting from monthly:', annualTax, '→', annualTax * 12);
        annualTax = annualTax * 12;
      }
    } else {
      console.log('🏠 ✅ Tax amount passes validation:', annualTax);
    }
  } else {
    console.log('🏠 ❌ No property tax found. Will use estimated value in calculations.');
  }
  
  const result = { price, annualTax };
  console.log('🏠 Final extraction result:', result);
  
  // Add extraction metadata for debugging
  if (isZillow && annualTax) {
    result.extractionNote = 'Zillow tax extracted - please verify against tax history section';
  }
  
  return result;
}

// Enhanced numeric value extraction with better tax handling
function extractNumericValue(text) {
  if (!text) return null;
  
  // Remove all non-digit characters except commas and periods
  const cleanText = text.replace(/[^\d,.-]/g, '');
  
  // Handle cases like "1,250,000" or "1.25M"
  if (text.includes('M') || text.includes('million')) {
    const num = parseFloat(cleanText);
    return Math.round(num * 1000000);
  }
  
  if (text.includes('K') || text.includes('thousand')) {
    const num = parseFloat(cleanText);
    return Math.round(num * 1000);
  }
  
  // Regular number with commas
  const num = parseFloat(cleanText.replace(/,/g, ''));
  return isNaN(num) ? null : Math.round(num);
}

// Helper function to validate if a tax amount seems reasonable
function isValidTaxAmount(amount, isAnnual = true) {
  if (!amount || amount <= 0) return false;
  
  if (isAnnual) {
    // Annual tax should typically be between $500 and $50,000 for most properties
    return amount >= 500 && amount <= 50000;
  } else {
    // Monthly tax should typically be between $50 and $4,000
    return amount >= 50 && amount <= 4000;
  }
}

// Message listener for popup communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('🏠 Received message:', request);
  
  if (request.type === "getListingData") {
    try {
      const data = extractPropertyData();
      console.log('🏠 Sending data to popup:', data);
      sendResponse(data);
    } catch (error) {
      console.error('🏠 Error extracting data:', error);
      sendResponse({ error: error.message });
    }
  }
  
  return true; // Keep message channel open for async response
});

// Initialize extraction when script loads
console.log('🏠 Content script ready on:', window.location.href);
