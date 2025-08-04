// ROI Calculation Strategies with dynamic parameters

let currentData = null;
let currentStrategy = 'conventional';

function getFormParameters() {
  // Get the appropriate target price field based on current strategy
  const targetPriceFieldId = currentStrategy === 'conventional' ? 'targetPurchasePriceConventional' : 'targetPurchasePriceHeloc';
  const targetPriceFieldValue = document.getElementById(targetPriceFieldId).value;
  const targetPriceNumber = parseFloat(targetPriceFieldValue);
  console.log('🏠 Popup: Target price field ID:', targetPriceFieldId);
  console.log('🏠 Popup: Target price field value:', targetPriceFieldValue);
  console.log('🏠 Popup: Target price number:', targetPriceNumber);
  
  const params = {
    rent: parseFloat(document.getElementById('rent').value) || 1800,
    improvements: parseFloat(document.getElementById('improvements').value) || 10000,
    renovationPeriod: parseFloat(document.getElementById('renovationPeriod').value) || 4,
    targetROI: 10, // Hardcoded to 10%
    targetPurchasePrice: targetPriceNumber || 0, // Changed from null to 0
    interestRate: parseFloat(document.getElementById('interestRate').value) || 7.5,
    percentDown: parseFloat(document.getElementById('percentDown').value) || 20,
    loanTerm: parseFloat(document.getElementById('loanTerm').value) || 30,
    closingCosts: parseFloat(document.getElementById('closingCosts').value) || 5000,
    insurance: parseFloat(document.getElementById('insurance').value) || 120,
    otherMisc: parseFloat(document.getElementById('otherMisc').value) || 200
  };
  
  // HELOC specific parameters
  if (currentStrategy === 'heloc') {
    params.helocRate = parseFloat(document.getElementById('helocRate').value) || 9.25;
    params.helocAmount = parseFloat(document.getElementById('helocAmount').value) || 60000;
    params.helocTerm = parseFloat(document.getElementById('helocTerm').value) || 10;
    params.seasoningPeriod = parseFloat(document.getElementById('seasoningPeriod').value) || 2;
    params.refinanceRate = parseFloat(document.getElementById('refinanceRate').value) || 7.63;
    params.arv = parseFloat(document.getElementById('arv').value) || 220000;
  }
  
  return params;
}

function populateFormDefaults(strategy) {
  // Get current values for cross-tab sync
  const currentRent = parseFloat(document.getElementById('rent').value) || 0;
  const currentImprovements = parseFloat(document.getElementById('improvements').value) || 0;
  const currentRenovationPeriod = parseFloat(document.getElementById('renovationPeriod').value) || 0;
  
  // Set strategy-specific defaults
  if (strategy === 'conventional') {
    // Only set defaults if fields are empty (first load)
    if (!currentRent) document.getElementById('rent').value = 1800;
    if (!currentImprovements) document.getElementById('improvements').value = 10000;
    if (!currentRenovationPeriod) document.getElementById('renovationPeriod').value = 4;
    document.getElementById('interestRate').value = 7.5;
    document.getElementById('percentDown').value = 20;
    document.getElementById('closingCosts').value = 5000;
    document.getElementById('insurance').value = 120;
    document.getElementById('otherMisc').value = 200;
  } else {
    // Preserve rent, improvements, and renovation period values when switching tabs
    if (!currentRent) document.getElementById('rent').value = 1700;
    if (!currentImprovements) document.getElementById('improvements').value = 10000;
    if (!currentRenovationPeriod) document.getElementById('renovationPeriod').value = 4;
    document.getElementById('closingCosts').value = 1000;
    document.getElementById('insurance').value = 75;
    document.getElementById('otherMisc').value = 200;
    
    // HELOC specific - set HELOC amount to match renovation budget
    document.getElementById('helocRate').value = 9.25;
    const improvementsValue = parseFloat(document.getElementById('improvements').value) || 10000;
    document.getElementById('helocAmount').value = improvementsValue;
    document.getElementById('helocTerm').value = 10;
    
    // Set seasoning period to match renovation period
    const renovationPeriodValue = parseFloat(document.getElementById('renovationPeriod').value) || 4;
    document.getElementById('seasoningPeriod').value = renovationPeriodValue;
    
    document.getElementById('refinanceRate').value = 7.63;
  }
  
  // Calculate default ARV only for HELOC strategy: purchase price / 0.7
  if (strategy === 'heloc') {
    updateDefaultARV();
  }
}

// Function to calculate and update default ARV based on purchase price / 0.7 (HELOC strategy only)
// If ARV is user-modified, preserve that value
function updateDefaultARV(overridePurchasePrice = null, forceUpdate = false) {
  // Only calculate ARV for HELOC strategy
  if (currentStrategy !== 'heloc') {
    console.log('🏠 ARV calculation skipped - not HELOC strategy');
    return;
  }
  
  const arvField = document.getElementById('arv');
  if (!arvField) {
    console.log('🏠 ARV field not found');
    return;
  }
  
  const improvements = parseFloat(document.getElementById('improvements').value) || 10000;
  
  // Use override price if provided, otherwise get from field or currentData
  let purchasePrice = 0;
  if (overridePurchasePrice && overridePurchasePrice > 0) {
    purchasePrice = overridePurchasePrice;
    console.log('🏠 Using override purchase price for ARV calculation:', purchasePrice);
  } else {
    const targetPurchasePrice = parseFloat(document.getElementById('targetPurchasePriceHeloc').value) || 0;
    if (targetPurchasePrice > 0) {
      purchasePrice = targetPurchasePrice;
      console.log('🏠 Using HELOC target purchase price for ARV calculation:', purchasePrice);
    } else if (currentData && currentData.price) {
      purchasePrice = currentData.price;
      console.log('🏠 Using asking price for ARV calculation:', purchasePrice);
    } else {
      console.log('🏠 No purchase price available for ARV calculation');
      return;
    }
  }
  
  if (purchasePrice && purchasePrice > 0) {
    const defaultARV = purchasePrice / 0.7;
    
    console.log('🏠 ARV Calculation Details:');
    console.log('  - Purchase Price:', purchasePrice);
    console.log('  - Formula: Purchase Price / 0.7 (reverse of 70% LTV)');
    console.log('  - Calculation:', purchasePrice, '/ 0.7 =', defaultARV);
    
    // Only update if ARV field is empty, has the old default value, or if using override price (auto-calculated), or forced
    // But don't update if user has manually entered an ARV value
    const currentARV = parseFloat(arvField.value) || 0;
    const isUserModifiedARV = arvField.getAttribute('data-user-entered') === 'true';
    console.log('🏠 Current ARV value:', currentARV, 'Calculated ARV:', defaultARV, 'User modified:', isUserModifiedARV);
    
    if (!isUserModifiedARV && (currentARV === 0 || currentARV === 220000 || overridePurchasePrice || forceUpdate)) {
      arvField.value = Math.round(defaultARV);
      console.log('🏠 ✅ Updated ARV field to:', Math.round(defaultARV), 
        overridePurchasePrice ? '(override price provided)' : 
        forceUpdate ? '(forced update)' : 
        '(field was empty/default)');
    } else {
      console.log('🏠 ❌ ARV field not updated - user has manually entered value or other conditions not met:', currentARV, 'User modified:', isUserModifiedARV);
    }
  } else {
    console.log('🏠 ❌ Invalid purchase price for ARV calculation:', purchasePrice);
  }
}

// Function to calculate target purchase price for desired ROI (Conventional)
function calculateTargetPurchasePriceConventional(askingPrice, annualTax, params) {
  const targetROI = params.targetROI / 100;
  
  console.log('🏠 Calculating target price for conventional, targetROI:', targetROI);
  
  // Binary search to find the purchase price that yields target ROI
  let low = askingPrice * 0.5; // Start at 50% of asking
  let high = askingPrice * 1.2; // Up to 120% of asking
  let bestPrice = askingPrice;
  
  for (let iterations = 0; iterations < 50; iterations++) {
    const testPrice = (low + high) / 2;
    // Create a copy of params with the test price as a manual override
    const testParams = { ...params, targetPurchasePrice: testPrice };
    const result = calculateConventionalROI(askingPrice, annualTax, testParams);
    
    if (Math.abs(result.roi / 100 - targetROI) < 0.001) {
      bestPrice = testPrice;
      break;
    }
    
    if (result.roi / 100 < targetROI) {
      high = testPrice; // Need lower purchase price
    } else {
      low = testPrice; // Can afford higher purchase price
    }
    
    bestPrice = testPrice;
  }
  
  console.log('🏠 Target price calculation result:', bestPrice);
  return bestPrice;
}

// Function to calculate target purchase price for desired ROI (HELOC)
function calculateTargetPurchasePriceHeloc(askingPrice, annualTax, params) {
  const targetROI = params.targetROI / 100;
  
  console.log('🏠 Calculating target price for HELOC, targetROI:', targetROI);
  console.log('🏠 HELOC initial params:', { improvements: params.improvements, helocAmount: params.helocAmount, arv: params.arv });
  
  // Binary search to find the purchase price that yields target ROI
  let low = askingPrice * 0.3; // Start lower to avoid getting stuck at 50%
  let high = askingPrice * 1.0; // Don't go above asking price for HELOC strategy
  let bestPrice = askingPrice;
  let bestROI = 0;
  
  console.log(`🏠 HELOC binary search range: low=${Math.round(low)}, high=${Math.round(high)}`);
  
  for (let iterations = 0; iterations < 50; iterations++) {
    const testPrice = (low + high) / 2;
    // Create a copy of params with the test price as a manual override
    const testParams = { ...params, targetPurchasePrice: testPrice };
    
    // Calculate ARV for this test price: purchase price / 0.7
    testParams.arv = testPrice / 0.7;
    
    console.log(`🏠 HELOC iteration ${iterations}: testPrice=${Math.round(testPrice)}, calculatedARV=${Math.round(testParams.arv)}`);
    console.log(`🏠 ARV calculation check: ${Math.round(testPrice)} / 0.7 = ${Math.round(testParams.arv)}`);
    console.log(`🏠 Renovation period: ${params.renovationPeriod} months ${params.renovationPeriod < 6 ? '(time constraint applies)' : '(no time constraint)'}`);
    
    const result = calculateHelocROI(askingPrice, annualTax, testParams);
    
    console.log(`🏠 HELOC iteration ${iterations}: ROI=${result.roi.toFixed(2)}%, target=${(targetROI*100).toFixed(2)}%, low=${Math.round(low)}, high=${Math.round(high)}`);
    
    // Track the best result
    if (Math.abs(result.roi / 100 - targetROI) < Math.abs(bestROI / 100 - targetROI)) {
      bestPrice = testPrice;
      bestROI = result.roi;
    }
    
    // Check for convergence
    if (Math.abs(result.roi / 100 - targetROI) < 0.001) {
      bestPrice = testPrice;
      console.log('🏠 HELOC target price found (converged):', Math.round(bestPrice));
      break;
    }
    
    // Adjust search range
    if (result.roi / 100 < targetROI) {
      // ROI is too low, we need a lower purchase price
      high = testPrice;
    } else {
      // ROI is too high, we can afford a higher purchase price
      low = testPrice;
    }
    
    // Check if we've converged on a small range
    if ((high - low) < 1000) {
      console.log('🏠 HELOC search range converged, stopping');
      break;
    }
  }
  
  console.log('🏠 HELOC target price calculation result:', Math.round(bestPrice), `(${bestROI.toFixed(2)}% ROI)`);
  return bestPrice;
}

function calculateConventionalROI(askingPrice, annualTax, params) {
  // Determine purchase price
  let purchasePrice;
  let isTargetPrice = false;
  
  if (params.targetPurchasePrice && params.targetPurchasePrice > 0) {
    // User manually entered a price - use it
    purchasePrice = params.targetPurchasePrice;
  } else {
    // Auto-calculate target price for 10% ROI
    purchasePrice = calculateTargetPurchasePriceConventional(askingPrice, annualTax, params);
    isTargetPrice = true;
  }
  
  const downPayment = purchasePrice * (params.percentDown / 100);
  const loanAmount = purchasePrice - downPayment;
  
  // Calculate mortgage payment (P&I only)
  const monthlyRate = (params.interestRate / 100) / 12;
  const numPayments = params.loanTerm * 12;
  const mortgagePayment = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                         (Math.pow(1 + monthlyRate, numPayments) - 1);
  
  // Calculate holding costs during renovation
  const holdingCosts = mortgagePayment * params.renovationPeriod;
  
  // Total cash invested
  const totalCashIn = downPayment + params.closingCosts + params.improvements + holdingCosts;
  
  // Monthly breakdown
  const monthlyTax = annualTax / 12;
  const monthlyCashFlow = params.rent - mortgagePayment - monthlyTax - 
                         params.insurance - params.otherMisc;
  
  const annualCashFlow = monthlyCashFlow * 12;
  const roi = (annualCashFlow / totalCashIn) * 100;
  const paybackPeriod = totalCashIn / annualCashFlow;
  
  // Calculate discount from asking price
  const discountPercent = ((askingPrice - purchasePrice) / askingPrice) * 100;
  
  return {
    strategy: "Conventional Financing",
    askingPrice,
    purchasePrice,
    discountPercent,
    downPayment,
    loanAmount,
    mortgagePayment,
    totalCashIn,
    monthlyCashFlow,
    annualCashFlow,
    roi,
    paybackPeriod,
    holdingCosts,
    isTargetPrice,
    details: {
      rent: params.rent,
      taxes: monthlyTax,
      insurance: params.insurance,
      other: params.otherMisc
    }
  };
}

function calculateHelocROI(askingPrice, annualTax, params) {
  // Determine purchase price
  let purchasePrice;
  
  if (params.targetPurchasePrice && params.targetPurchasePrice > 0) {
    // User manually entered a price or binary search test price - use it
    purchasePrice = params.targetPurchasePrice;
  } else {
    // Use asking price as fallback
    purchasePrice = askingPrice;
  }
  
  // Total holding period: renovation + 1 month for refinancing (seasoning overlaps with renovation)
  const totalHoldingPeriod = params.renovationPeriod + 1;
  
  // Initial cash investment (all cash purchase)
  const initialCashIn = purchasePrice + params.closingCosts + params.improvements;
  
  // HELOC holding costs during renovation + seasoning + refinancing (1 extra month)
  const helocMonthlyRate = (params.helocRate / 100) / 12;
  const helocPayments = params.helocTerm * 12;
  const helocMonthlyPayment = (params.helocAmount * helocMonthlyRate * Math.pow(1 + helocMonthlyRate, helocPayments)) / 
                            (Math.pow(1 + helocMonthlyRate, helocPayments) - 1);
  const holdingCosts = helocMonthlyPayment * totalHoldingPeriod;
  const totalCashIn = initialCashIn + holdingCosts;
  
  // Refinance calculations - with time-based constraint
  // If renovation period < 6 months, refinance cannot exceed purchase price
  const maxRefinanceByTime = params.renovationPeriod < 6 ? purchasePrice : Infinity;
  const maxRefinanceByARV = params.arv * 0.70;
  const refinanceLoanAmount = Math.min(maxRefinanceByTime, maxRefinanceByARV);
  
  console.log(`🏠 Refinance calculation:`);
  console.log(`  - Renovation period: ${params.renovationPeriod} months`);
  console.log(`  - Purchase price limit: ${params.renovationPeriod < 6 ? '$' + purchasePrice.toLocaleString() : 'No limit'}`);
  console.log(`  - 70% of ARV: $${maxRefinanceByARV.toLocaleString()}`);
  console.log(`  - Final refinance amount: $${refinanceLoanAmount.toLocaleString()}`);
  
  const refinanceClosingCosts = 5000; // Fixed from original spreadsheet
  const cashOut = refinanceLoanAmount - refinanceClosingCosts;
  const finalCashIn = totalCashIn - cashOut;
  
  // Calculate refinance mortgage payment
  const monthlyRate = (params.refinanceRate / 100) / 12;
  const numPayments = 30 * 12; // 30-year refinance
  const mortgagePayment = (refinanceLoanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                         (Math.pow(1 + monthlyRate, numPayments) - 1);
  
  // Monthly breakdown (after refinance - HELOC is paid off)
  const monthlyTax = annualTax / 12;
  const monthlyCashFlowWithHeloc = params.rent - mortgagePayment - monthlyTax - 
                                  params.insurance - params.otherMisc;
  
  const annualCashFlow = monthlyCashFlowWithHeloc * 12;
  const roi = (annualCashFlow / finalCashIn) * 100;
  const paybackPeriod = finalCashIn / annualCashFlow;
  
  // Calculate discount from asking price
  const discountPercent = ((askingPrice - purchasePrice) / askingPrice) * 100;
  
  return {
    strategy: "Cash Offer + HELOC Refinance",
    askingPrice,
    purchasePrice,
    discountPercent,
    totalCashIn,
    cashOut,
    finalCashIn,
    arv: params.arv,
    refinanceLoanAmount,
    mortgagePayment,
    helocPayment: helocMonthlyPayment,
    monthlyCashFlowWithHeloc,
    annualCashFlow,
    roi,
    paybackPeriod,
    holdingCosts,
    renovationPeriod: params.renovationPeriod,
    details: {
      rent: params.rent,
      taxes: monthlyTax,
      insurance: params.insurance,
      other: params.otherMisc
    }
  };
}

function formatResults(calculation, isHeloc) {
  const roiColor = calculation.roi > 8 ? '#2e7d32' : calculation.roi > 5 ? '#f57c00' : '#d32f2f';
  
  let html = `
    <div class="results">
      <div class="roi-highlight" style="color: ${roiColor}">
        ${calculation.roi.toFixed(1)}% Annual ROI
      </div>
      
      <!-- Side-by-side layout for summary and details -->
      <div style="display: flex; gap: 20px; margin-top: 15px;">
        
        <!-- Left side: Summary -->
        <div style="flex: 1; min-width: 250px;">
          <div class="details">
            <strong>Purchase:</strong> $${calculation.purchasePrice.toLocaleString()}`;
            
  // Show discount info if we have asking price and purchase price differs
  if (calculation.askingPrice && calculation.discountPercent !== undefined) {
    const discountColor = calculation.discountPercent > 0 ? '#2e7d32' : '#d32f2f';
    if (calculation.isTargetPrice) {
      html += ` <span style="color: ${discountColor}">(${calculation.discountPercent.toFixed(1)}% discount for 10% ROI)</span>`;
    } else {
      html += ` <span style="color: ${discountColor}">(${calculation.discountPercent.toFixed(1)}% vs asking $${calculation.askingPrice.toLocaleString()})</span>`;
    }
  }
  
  html += `<br><strong>Total Cash In:</strong> $${calculation.totalCashIn.toLocaleString()}`;
  
  if (isHeloc) {
    html += `<br><strong>Cash Out (Refinance):</strong> $${calculation.cashOut.toLocaleString()}
             <br><strong>Final Cash In:</strong> $${calculation.finalCashIn.toLocaleString()}
             <br><strong>ARV:</strong> $${calculation.arv.toLocaleString()}`;
  }
  
  html += `<br><strong>Holding Costs:</strong> $${calculation.holdingCosts.toLocaleString()}
           <br><strong>Payback Period:</strong> ${calculation.paybackPeriod.toFixed(1)} years
          </div>
          
          <div class="details" style="margin-top: 15px;">
            <strong>Monthly Cash Flow:</strong><br>
            
            <div class="cash-flow-income">
              <div style="font-weight: bold;">+ Income:</div>
              <div style="margin-left: 15px;">
                + Rent: $${calculation.details.rent}
              </div>
            </div>
            
            <div class="cash-flow-expenses">
              <div style="font-weight: bold;">- Expenses:</div>
              <div style="margin-left: 15px;">
                - Mortgage: $${Math.round(calculation.mortgagePayment)}<br>
                - Taxes: $${Math.round(calculation.details.taxes)}<br>
                - Insurance: $${calculation.details.insurance}<br>
                - Other: $${calculation.details.other}`;
    
  if (isHeloc) {
    html += `</div>
            </div>
            
            <div class="cash-flow-net ${calculation.monthlyCashFlowWithHeloc >= 0 ? 'cash-flow-positive' : 'cash-flow-negative'}">
              <div style="font-weight: bold;">= Net Cash Flow (post-refinance):</div>
              <div style="font-size: 16px; font-weight: bold; color: ${calculation.monthlyCashFlowWithHeloc >= 0 ? '#2e7d32' : '#d32f2f'};">
                $${Math.round(calculation.monthlyCashFlowWithHeloc)} per month
              </div>
              <div style="font-size: 10px; color: #666; margin-top: 2px;">
                (HELOC paid off at refinance)
              </div>
            </div>
          </div>
        </div>
        
        <!-- Right side: Detailed Calculations -->
        <div style="flex: 1; min-width: 250px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 5px; padding: 10px; font-size: 11px;">
          <strong>Step-by-Step Calculations:</strong><br><br>`;
          
    // Get the actual refinance loan amount from the calculation
    const refinanceClosingCosts = 5000;
    const totalHoldingPeriod = (calculation.holdingCosts / calculation.helocPayment);
    const renovationPeriod = Math.round(totalHoldingPeriod - 1); // Subtract 1 month for refinancing
    const hasTimeConstraint = renovationPeriod < 6;
    
    html += `
      <strong>INITIAL INVESTMENT:</strong><br>
      - Purchase Price: $${calculation.purchasePrice.toLocaleString()}<br>
      - Closing Costs: $1,000<br>
      - Improvements: $${(calculation.totalCashIn - calculation.purchasePrice - 1000 - calculation.holdingCosts).toLocaleString()}<br>
      - HELOC Payments (holding period only - ${Math.round(totalHoldingPeriod)} months): $${calculation.holdingCosts.toLocaleString()}<br>
      <small style="color: #666;">  * HELOC paid off at refinance completion</small><br>
      <strong>= Total Cash In: $${calculation.totalCashIn.toLocaleString()}</strong><br><br>
      
      <strong>REFINANCE RECOVERY:</strong><br>
      - ARV (After Repair Value): $${calculation.arv.toLocaleString()}<br>
      - Renovation Period: ${renovationPeriod} months ${hasTimeConstraint ? '(<6 months)' : '(≥6 months)'}<br>
      - Standard Refinance Limit: 70% of ARV = $${Math.round(calculation.arv * 0.7).toLocaleString()}<br>
      ${hasTimeConstraint ? `- Time Constraint: Cannot exceed purchase price = $${calculation.purchasePrice.toLocaleString()}<br>` : ''}
      - Actual Refinance Loan Amount: $${Math.round(calculation.refinanceLoanAmount).toLocaleString()}<br>
      - Refinance Closing Costs: -$${refinanceClosingCosts.toLocaleString()}<br>
      <strong>= Cash Out: $${calculation.cashOut.toLocaleString()}</strong><br><br>
      
      <strong>FINAL INVESTMENT:</strong><br>
      - Total Cash In: $${calculation.totalCashIn.toLocaleString()}<br>
      - Cash Out: -$${calculation.cashOut.toLocaleString()}<br>
      <strong>= Final Cash In: $${calculation.finalCashIn.toLocaleString()}</strong><br><br>
      
      <strong>ROI CALCULATION:</strong><br>
      - Monthly Net Cash Flow (post-refinance): $${Math.round(calculation.monthlyCashFlowWithHeloc)}<br>
      - Annual Cash Flow: $${Math.round(calculation.annualCashFlow).toLocaleString()}<br>
      - Final Cash In: $${calculation.finalCashIn.toLocaleString()}<br>
      <strong>= ROI: $${Math.round(calculation.annualCashFlow).toLocaleString()} / $${calculation.finalCashIn.toLocaleString()} = ${calculation.roi.toFixed(1)}%</strong>`;
  } else {
    html += `
              </div>
            </div>
            
            <div class="cash-flow-net ${calculation.monthlyCashFlow >= 0 ? 'cash-flow-positive' : 'cash-flow-negative'}">
              <div style="font-weight: bold;">= Net Cash Flow:</div>
              <div style="font-size: 16px; font-weight: bold; color: ${calculation.monthlyCashFlow >= 0 ? '#2e7d32' : '#d32f2f'};">
                $${Math.round(calculation.monthlyCashFlow)} per month
              </div>
            </div>
          </div>
        </div>
        
        <!-- Right side: Detailed Calculations -->
        <div style="flex: 1; min-width: 250px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 5px; padding: 10px; font-size: 11px;">
          <strong>Step-by-Step Calculations:</strong><br><br>
          
          <strong>TOTAL INVESTMENT:</strong><br>
          - Down Payment: $${calculation.downPayment.toLocaleString()}<br>
          - Closing Costs: $5,000<br>
          - Improvements: $${(calculation.totalCashIn - calculation.downPayment - 5000 - calculation.holdingCosts).toLocaleString()}<br>
          - Holding Costs (${Math.round(calculation.holdingCosts / calculation.mortgagePayment)} months): $${calculation.holdingCosts.toLocaleString()}<br>
          <strong>= Total Cash In: $${calculation.totalCashIn.toLocaleString()}</strong><br><br>
          
          <strong>LOAN DETAILS:</strong><br>
          - Purchase Price: $${calculation.purchasePrice.toLocaleString()}<br>
          - Down Payment: $${calculation.downPayment.toLocaleString()}<br>
          - Loan Amount: $${calculation.loanAmount.toLocaleString()}<br>
          - Monthly Mortgage: $${Math.round(calculation.mortgagePayment)}<br><br>
          
          <strong>ROI CALCULATION:</strong><br>
          - Monthly Net Cash Flow: $${Math.round(calculation.monthlyCashFlow)}<br>
          - Annual Cash Flow: $${Math.round(calculation.annualCashFlow).toLocaleString()}<br>
          - Total Cash In: $${calculation.totalCashIn.toLocaleString()}<br>
          <strong>= ROI: $${Math.round(calculation.annualCashFlow).toLocaleString()} / $${calculation.totalCashIn.toLocaleString()} = ${calculation.roi.toFixed(1)}%</strong>`;
  }
  
  html += `
        </div>
      </div>
    </div>`;
  
  return html;
}

document.addEventListener("DOMContentLoaded", () => {
  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const oldStrategy = currentStrategy;
      currentStrategy = tab.dataset.strategy;
      
      // Show/hide HELOC specific fields
      const helocAdvanced = document.getElementById('heloc-advanced');
      if (currentStrategy === 'heloc') {
        helocAdvanced.classList.remove('hidden');
      } else {
        helocAdvanced.classList.add('hidden');
      }
      
      // Show/hide strategy-specific target price fields
      const conventionalField = document.getElementById('targetPurchasePriceConventional');
      const helocField = document.getElementById('targetPurchasePriceHeloc');
      
      if (currentStrategy === 'conventional') {
        conventionalField.classList.remove('hidden');
        helocField.classList.add('hidden');
        console.log('🏠 Switched to conventional strategy, showing conventional target price field');
      } else {
        conventionalField.classList.add('hidden');
        helocField.classList.remove('hidden');
        console.log('🏠 Switched to HELOC strategy, showing HELOC target price field');
      }
      
      // Update form defaults for new strategy
      populateFormDefaults(currentStrategy);
      
      if (currentData) {
        updateResults();
      }
    });
  });
  
  // Advanced toggle
  document.getElementById('toggle-advanced').addEventListener('click', () => {
    const advancedSection = document.getElementById('advanced-section');
    const toggleButton = document.getElementById('toggle-advanced');
    
    if (advancedSection.classList.contains('hidden')) {
      advancedSection.classList.remove('hidden');
      toggleButton.textContent = 'Hide Advanced Parameters';
    } else {
      advancedSection.classList.add('hidden');
      toggleButton.textContent = 'Show Advanced Parameters';
    }
  });
  
  // Target purchase price handling for both strategies
  ['targetPurchasePriceConventional', 'targetPurchasePriceHeloc'].forEach(fieldId => {
    document.getElementById(fieldId).addEventListener('input', function() {
      // Mark as manually entered when user types
      this.setAttribute('data-user-entered', 'true');
      this.style.background = '#ffffff';
      
      // Update default ARV when target purchase price changes (HELOC strategy only)
      if (currentStrategy === 'heloc' && fieldId === 'targetPurchasePriceHeloc') {
        const purchasePrice = parseFloat(this.value) || 0;
        if (purchasePrice > 0) {
          console.log('🏠 Purchase price manually changed to:', purchasePrice);
          updateDefaultARV(purchasePrice, false); // Use new purchase price, but respect user ARV if set
        }
      }
      
      if (currentData) {
        updateResults();
      }
    });
    
    // Clear placeholder styling when user starts typing
    document.getElementById(fieldId).addEventListener('focus', function() {
      if (!this.getAttribute('data-user-entered')) {
        this.style.background = '#ffffff';
      }
    });
    
    document.getElementById(fieldId).addEventListener('blur', function() {
      if (!this.value && !this.getAttribute('data-user-entered')) {
        this.style.background = '#f9f9f9';
        this.placeholder = 'Auto-calculated';
      }
    });
  });
  
  // Calculate button
  document.getElementById('calculate-btn').addEventListener('click', () => {
    updateResults();
  });
  
  // Recalculate target price button
  document.getElementById('recalculate-target-price').addEventListener('click', () => {
    const targetPriceFieldId = currentStrategy === 'conventional' ? 'targetPurchasePriceConventional' : 'targetPurchasePriceHeloc';
    const targetPriceField = document.getElementById(targetPriceFieldId);
    if (targetPriceField) {
      // Clear the field and set it to auto-calculate mode
      targetPriceField.value = '';
      targetPriceField.style.background = '#f9f9f9';
      targetPriceField.placeholder = 'Auto-calculated';
      targetPriceField.removeAttribute('data-user-entered');
      console.log('🏠 User requested recalculation of target price for strategy:', currentStrategy);
      
      // Trigger recalculation
      if (currentData) {
        updateResults();
      }
    }
  });
  
  // Auto-calculate on key input changes with cross-tab sync
  ['rent', 'improvements', 'renovationPeriod'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      // Special handling for improvements - update HELOC amount automatically
      if (id === 'improvements') {
        const improvementsValue = parseFloat(document.getElementById('improvements').value) || 0;
        const helocAmountField = document.getElementById('helocAmount');
        if (improvementsValue > 0 && helocAmountField) {
          helocAmountField.value = improvementsValue;
        }
        
        // Update default ARV when improvements change (HELOC strategy only)
        if (currentStrategy === 'heloc') {
          updateDefaultARV();
        }
      }
      
      // Special handling for renovation period - update seasoning period automatically
      if (id === 'renovationPeriod') {
        const renovationPeriodValue = parseFloat(document.getElementById('renovationPeriod').value) || 0;
        const seasoningPeriodField = document.getElementById('seasoningPeriod');
        if (renovationPeriodValue > 0 && seasoningPeriodField) {
          seasoningPeriodField.value = renovationPeriodValue;
        }
      }
      
      // Only clear target purchase price if it's currently auto-calculated (not manually entered)
      const targetPriceFieldId = currentStrategy === 'conventional' ? 'targetPurchasePriceConventional' : 'targetPurchasePriceHeloc';
      const targetPriceField = document.getElementById(targetPriceFieldId);
      if (targetPriceField && !targetPriceField.getAttribute('data-user-entered')) {
        // Field is not manually entered, safe to clear and recalculate
        targetPriceField.value = '';
        targetPriceField.style.background = '#f9f9f9';
        targetPriceField.placeholder = 'Auto-calculated';
        console.log('🏠 Clearing auto-calculated target price due to input change in:', id);
      } else if (targetPriceField) {
        console.log('🏠 Preserving user-entered target price despite input change in:', id);
      }
      
      if (currentData) {
        updateResults();
      }
    });
  });
  
  // Add specific listener for HELOC amount field to maintain sync
  document.getElementById('helocAmount').addEventListener('focus', () => {
    // When user focuses on HELOC amount, suggest it matches improvements
    const improvementsValue = parseFloat(document.getElementById('improvements').value) || 0;
    const helocAmountField = document.getElementById('helocAmount');
    if (improvementsValue > 0 && (!helocAmountField.value || helocAmountField.value == 10000)) {
      helocAmountField.value = improvementsValue;
    }
  });
  
  // Add listener for ARV field to track user modifications
  document.getElementById('arv').addEventListener('input', function() {
    // Mark ARV as manually entered when user types
    this.setAttribute('data-user-entered', 'true');
    console.log('🏠 ARV field manually modified by user');
    
    if (currentData) {
      updateResults();
    }
  });
  
  // Main data extraction
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    const output = document.getElementById("output");
    
    // Check if we're on a supported site
    if (!currentTab.url.includes('redfin.com') && !currentTab.url.includes('zillow.com')) {
      output.innerHTML = '<div class="error">Please navigate to a Redfin or Zillow property page.</div>';
      return;
    }

    // Show better loading message
    output.innerHTML = '<div class="loading">Extracting property data...</div>';
    
    // Try to send message to existing content script with timeout
    const tryExtractData = (attempt = 1, maxAttempts = 3) => {
      console.log(`🏠 Popup: Attempt ${attempt} to extract data...`);
      
      chrome.tabs.sendMessage(currentTab.id, { type: "getListingData" }, (data) => {
        if (chrome.runtime.lastError) {
          console.log(`🏠 Popup: Attempt ${attempt} - Content script not found`, chrome.runtime.lastError);
          
          if (attempt === 1) {
            // First attempt failed, inject content script
            output.innerHTML = '<div class="loading">Loading extension script...</div>';
            
            chrome.scripting.executeScript({
              target: { tabId: currentTab.id },
              files: ['content.js']
            }, () => {
              if (chrome.runtime.lastError) {
                const errorMsg = chrome.runtime.lastError.message || 'Unknown error';
                output.innerHTML = `<div class="error">Error: Could not inject script (${errorMsg}). <br><br><strong>Try these steps:</strong><br>1. Reload this property page<br>2. Open the extension again<br>3. Make sure you're on a Redfin or Zillow listing page</div>`;
                console.error('🏠 Popup: Script injection error:', chrome.runtime.lastError);
                return;
              }
              
              // Wait longer for script to initialize and try again
              output.innerHTML = '<div class="loading">Script loaded, extracting data...</div>';
              setTimeout(() => {
                tryExtractData(2, maxAttempts);
              }, 1500);
            });
          } else if (attempt < maxAttempts) {
            // Retry with longer timeout
            output.innerHTML = '<div class="loading">Retrying data extraction... (attempt ' + attempt + ')</div>';
            setTimeout(() => {
              tryExtractData(attempt + 1, maxAttempts);
            }, 2000);
          } else {
            // All attempts failed - provide detailed troubleshooting
            output.innerHTML = `<div class="error">
              <strong>Could not extract property data</strong><br><br>
              <strong>Troubleshooting steps:</strong><br>
              1. Make sure you're on a property listing page (not search results)<br>
              2. Reload the property page and try again<br>
              3. Check if the page has fully loaded (no loading spinners)<br>
              4. Try opening the extension on a different property<br><br>
              <small>Current URL: ${currentTab.url}</small><br>
              <small>If the issue persists, this property page may use a different layout.</small>
            </div>`;
            console.error('🏠 Popup: All extraction attempts failed');
          }
        } else if (data && data.error) {
          // Content script returned an error
          output.innerHTML = `<div class="error">Extraction error: ${data.error}<br><small>Try reloading the page and opening the extension again.</small></div>`;
          console.error('🏠 Popup: Content script error:', data.error);
        } else {
          // Success!
          console.log(`🏠 Popup: Attempt ${attempt} - Data extraction successful`, data);
          handleDataReceived(data);
        }
      });
    };
    
    // Start the extraction process
    tryExtractData();
  });
});

function handleDataReceived(data) {
  console.log('🏠 Popup: Received data:', data);
  currentData = data;
  
  // Check for extraction errors
  if (data && data.error) {
    document.getElementById("output").innerHTML = `<div class="error">Extraction error: ${data.error}</div>`;
    return;
  }
  
  // Validate extracted data
  if (!data || (!data.price && !data.annualTax)) {
    document.getElementById("output").innerHTML = `
      <div class="error">
        <strong>No property data found</strong><br><br>
        This could happen if:<br>
        - The page layout has changed<br>
        - The page hasn't fully loaded<br>
        - You're not on a property details page<br><br>
        <strong>Try:</strong><br>
        1. Reload the page and wait for it to fully load<br>
        2. Make sure you're on a specific property page (not search results)<br>
        3. Try a different property listing
      </div>`;
    return;
  }
  
  if (!data.price) {
    document.getElementById("output").innerHTML = `
      <div class="error">
        <strong>Property price not found</strong><br><br>
        The extension couldn't find the listing price on this page.<br>
        This might be a sold property or the page layout is different.<br><br>
        <small>Found tax data: ${data.annualTax ? '$' + data.annualTax.toLocaleString() : 'None'}</small>
      </div>`;
    return;
  }
  
  if (!data.annualTax) {
    // Show warning but allow calculation with estimated tax
    const estimatedTax = Math.round(data.price * 0.015); // 1.5% estimate
    currentData.annualTax = estimatedTax;
    
    document.getElementById("property-info").style.display = "block";
    document.getElementById("property-info").innerHTML = `
      <strong>Property:</strong> $${data.price.toLocaleString()} asking price<br>
      <strong>Annual Taxes:</strong> <span style="color: #f57c00;">~$${estimatedTax.toLocaleString()} (estimated - tax data not found)</span>
    `;
    
    document.getElementById("input-form").style.display = "block";
    populateFormDefaults(currentStrategy);
    updateResults();
    return;
  }
  
  // Show property info and form
  document.getElementById("property-info").style.display = "block";
  document.getElementById("property-info").innerHTML = `
    <strong>Property:</strong> $${data.price.toLocaleString()} asking price<br>
    <strong>Annual Taxes:</strong> $${data.annualTax.toLocaleString()}
  `;
  
  document.getElementById("input-form").style.display = "block";
  
  // Set initial form defaults
  populateFormDefaults(currentStrategy);
  
  // Calculate initial results
  updateResults();
}

function updateResults() {
  if (!currentData) return;
  
  const output = document.getElementById("output");
  const params = getFormParameters();
  
  console.log('🏠 Popup: updateResults called with params:', params);
  console.log('🏠 Popup: targetPurchasePrice value:', params.targetPurchasePrice);
  console.log('🏠 Popup: currentStrategy:', currentStrategy);
  
  let calculation;
  if (currentStrategy === 'conventional') {
    calculation = calculateConventionalROI(currentData.price, currentData.annualTax, params);
    output.innerHTML = formatResults(calculation, false);
  } else {
    // For HELOC, check if we need to calculate target price
    if (!params.targetPurchasePrice || params.targetPurchasePrice <= 0) {
      console.log('🏠 Popup: HELOC auto-calculating target price...');
      // Calculate target price for 10% ROI
      const targetPrice = calculateTargetPurchasePriceHeloc(currentData.price, currentData.annualTax, params);
      console.log('🏠 Popup: Calculated HELOC target price:', targetPrice);
      
      // Update params with the target price AND calculated ARV for the ROI calculation
      const calculatedARV = targetPrice / 0.7;
      console.log(`🏠 Final ARV calculation: ${Math.round(targetPrice)} / 0.7 = ${Math.round(calculatedARV)}`);
      
      const paramsWithTarget = { 
        ...params, 
        targetPurchasePrice: targetPrice,
        arv: calculatedARV // Calculate ARV for final calculation
      };
      calculation = calculateHelocROI(currentData.price, currentData.annualTax, paramsWithTarget);
      // Ensure the calculation knows it's using an auto-calculated target price
      calculation.isTargetPrice = true;
      calculation.purchasePrice = targetPrice;
    } else {
      console.log('🏠 Popup: HELOC using user-entered price:', params.targetPurchasePrice);
      // Use user-entered price
      calculation = calculateHelocROI(currentData.price, currentData.annualTax, params);
      calculation.isTargetPrice = false;
      calculation.purchasePrice = params.targetPurchasePrice;
    }
    output.innerHTML = formatResults(calculation, true);
  }
  
  console.log('🏠 Popup: calculation result:', calculation);
  console.log('🏠 Popup: isTargetPrice:', calculation.isTargetPrice);
  
  // Update the target purchase price field if it's auto-calculated
  if (calculation.isTargetPrice) {
    const targetPriceFieldId = currentStrategy === 'conventional' ? 'targetPurchasePriceConventional' : 'targetPurchasePriceHeloc';
    const targetPriceField = document.getElementById(targetPriceFieldId);
    const newValue = Math.round(calculation.purchasePrice);
    console.log('🏠 Popup: Updating target price field', targetPriceFieldId, 'to:', newValue);
    targetPriceField.value = newValue;
    
    // Mark as auto-calculated (not user-entered)
    targetPriceField.removeAttribute('data-user-entered');
    targetPriceField.style.background = '#f9f9f9';
    
    // Update ARV after target purchase price is calculated (HELOC strategy only)
    if (currentStrategy === 'heloc') {
      // Pass the calculated purchase price directly and force update to avoid timing issues
      updateDefaultARV(newValue, true);
    }
  }
}

// No longer needed - removed toggleCalculations function
