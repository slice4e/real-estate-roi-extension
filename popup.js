// Real Estate ROI Calculator - Popup Script
console.log('🏠 Real Estate ROI Extension: Popup script loaded');

// =====================================================
// CONFIGURATION & CONSTANTS
// =====================================================

const CONFIG = {
  strategies: {
    conventional: 'conventional',
    heloc: 'heloc'
  },
  defaults: {
    insuranceRate: 0.35, // Default insurance rate percentage
    conventional: {
      rent: 1800,
      improvements: 10000,
      renovationPeriod: 4,
      interestRate: 7.5,
      percentDown: 20,
      loanTerm: 30,
      closingCosts: 5000,
      insurance: 120,
      propertyTaxes: 150,
      otherMisc: 200
    },
    heloc: {
      rent: 1700,
      improvements: 10000,
      renovationPeriod: 4,
      closingCosts: 1000,
      insurance: 75,
      propertyTaxes: 150,
      otherMisc: 200,
      helocRate: 9.25,
      helocTerm: 10,
      refinanceRate: 7.63,
      defaultARV: 220000
    }
  },
  thresholds: {
    targetROI: 10, // Hardcoded to 10%
    goodROI: 8,
    okROI: 5,
    seasoningMonths: 6,
    refinanceLTV: 0.70,
    refinanceClosingCosts: 5000,
    estimatedTaxRate: 0.015,
    binarySearchIterations: 50,
    convergenceThreshold: 0.001,
    rangeConvergenceThreshold: 1000
  },
  colors: {
    good: '#2e7d32',
    warning: '#f57c00',
    danger: '#d32f2f'
  },
  searchRanges: {
    conventional: { lowMultiplier: 0.5, highMultiplier: 1.2 },
    heloc: { lowMultiplier: 0.3, highMultiplier: 1.0 }
  }
};

const FIELD_IDS = {
  askingPrice: 'askingPrice',
  annualTax: 'annualTax',
  rent: 'rent',
  improvements: 'improvements',
  renovationPeriod: 'renovationPeriod',
  interestRate: 'interestRate',
  percentDown: 'percentDown',
  loanTerm: 'loanTerm',
  closingCosts: 'closingCosts',
  insurance: 'insurance',
  propertyTaxes: 'propertyTaxes',
  otherMisc: 'otherMisc',
  helocRate: 'helocRate',
  helocAmount: 'helocAmount',
  helocTerm: 'helocTerm',
  seasoningPeriod: 'seasoningPeriod',
  refinanceRate: 'refinanceRate',
  arv: 'arv',
  targetPurchasePriceConventional: 'targetPurchasePriceConventional',
  targetPurchasePriceHeloc: 'targetPurchasePriceHeloc'
};

// =====================================================
// SETTINGS MANAGEMENT
// =====================================================

class SettingsManager {
  static STORAGE_KEY = 'roiExtensionSettings';
  static DEFAULT_SETTINGS = {
    interestRate: 7.63, helocRate: 9.25, refinanceRate: 7.63, downPayment: 20,
    insuranceRate: 0.35, propertyTaxes: 150, helocTerm: 10, seasoningPeriod: 6
  };

  static async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(this.STORAGE_KEY);
      return { ...this.DEFAULT_SETTINGS, ...result[this.STORAGE_KEY] };
    } catch (error) {
      console.error('Error loading settings:', error);
      return this.DEFAULT_SETTINGS;
    }
  }

  static async saveSettings(settings) {
    try {
      await chrome.storage.sync.set({ [this.STORAGE_KEY]: settings });
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      return false;
    }
  }

  static async resetSettings() {
    try {
      await chrome.storage.sync.remove(this.STORAGE_KEY);
      return this.DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error resetting settings:', error);
      return this.DEFAULT_SETTINGS;
    }
  }

  static populateSettingsForm(settings) {
    const fields = [
      ['defaultInterestRate', settings.interestRate], ['defaultHelocRate', settings.helocRate], ['defaultRefinanceRate', settings.refinanceRate],
      ['defaultDownPayment', settings.downPayment], ['defaultInsuranceRate', settings.insuranceRate], ['defaultPropertyTaxes', settings.propertyTaxes],
      ['defaultHelocTerm', settings.helocTerm], ['defaultSeasoningPeriod', settings.seasoningPeriod]
    ];
    fields.forEach(([id, value]) => Utils.setElementValue(id, value));
    
    // Also update advanced option fields to match settings
    this.syncAdvancedFieldsWithSettings(settings);
  }

  static syncAdvancedFieldsWithSettings(settings) {
    // Update conventional advanced options
    Utils.setElementValue('interestRate', settings.interestRate);
    Utils.setElementValue('percentDown', settings.downPayment);
    
    // Update HELOC advanced options
    Utils.setElementValue('helocRate', settings.helocRate);
    Utils.setElementValue('refinanceRate', settings.refinanceRate);
    Utils.setElementValue('helocTerm', settings.helocTerm);
    Utils.setElementValue('seasoningPeriod', settings.seasoningPeriod);
  }

  static getSettingsFromForm() {
    const g = (id, def) => Utils.getFloatValue(id, def);
    return {
      interestRate: g('defaultInterestRate', 7.63), helocRate: g('defaultHelocRate', 9.25), refinanceRate: g('defaultRefinanceRate', 7.63),
      downPayment: g('defaultDownPayment', 20), insuranceRate: g('defaultInsuranceRate', 0.35), propertyTaxes: g('defaultPropertyTaxes', 150),
      helocTerm: g('defaultHelocTerm', 10), seasoningPeriod: g('defaultSeasoningPeriod', 6)
    };
  }

  static updateConfigWithSettings(settings) {
    Object.assign(CONFIG.defaults.conventional, { interestRate: settings.interestRate, percentDown: settings.downPayment, propertyTaxes: settings.propertyTaxes });
    Object.assign(CONFIG.defaults.heloc, { helocRate: settings.helocRate, helocTerm: settings.helocTerm, refinanceRate: settings.refinanceRate, propertyTaxes: settings.propertyTaxes });
    CONFIG.defaults.insuranceRate = settings.insuranceRate;
    CONFIG.thresholds.seasoningMonths = settings.seasoningPeriod;
  }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

// Consolidated utility object for brevity and reuse
const Utils = {
  getElement: id => document.getElementById(id),
  getFloatValue: (id, def = 0) => parseFloat(document.getElementById(id)?.value) || def,
  setElementValue: (id, value) => { const el = document.getElementById(id); if (el) el.value = value; },
  formatCurrency: a => typeof a === 'string' ? a : `$${Math.round(a).toLocaleString()}`,
  getROIColor: roi => roi > CONFIG.thresholds.goodROI ? CONFIG.colors.good : roi > CONFIG.thresholds.okROI ? CONFIG.colors.warning : CONFIG.colors.danger,
  isUserEntered: el => el?.getAttribute('data-user-entered') === 'true',
  markAsUserEntered: el => { if (el) { el.setAttribute('data-user-entered', 'true'); el.style.background = '#fff'; } },
  markAsAutoCalculated: el => { if (el) { el.removeAttribute('data-user-entered'); el.style.background = '#f9f9f9'; el.placeholder = 'Auto-calculated'; } },
  logCalculation: (ctx, data) => { if (window.DEBUG) console.log(`🏠 [${ctx}]`, data); }
};

// =====================================================
// MORTGAGE CALCULATIONS
// =====================================================

class MortgageCalculator {
  static calculateMonthlyPayment(principal, annualRate, termYears) {
    const monthlyRate = (annualRate / 100) / 12;
    const numPayments = termYears * 12;
    
    if (monthlyRate === 0) return principal / numPayments;
    
    return (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
           (Math.pow(1 + monthlyRate, numPayments) - 1);
  }
  
  static calculateHoldingCosts(monthlyPayment, months) {
    return monthlyPayment * months;
  }
}

// =====================================================
// FORM PARAMETER MANAGER
// =====================================================

class FormParameters {
  constructor(strategy) {
    this.strategy = strategy;
  }

  getAll() {
    const s = this.strategy, d = CONFIG.defaults, f = FIELD_IDS, g = Utils.getFloatValue;
    const base = {
      askingPrice: g(f.askingPrice, 0),
      annualTax: g(f.annualTax, 0),
      rent: g(f.rent, d[s].rent), improvements: g(f.improvements, d[s].improvements), renovationPeriod: g(f.renovationPeriod, d[s].renovationPeriod),
      targetROI: CONFIG.thresholds.targetROI,
      targetPurchasePrice: g(s === CONFIG.strategies.conventional ? f.targetPurchasePriceConventional : f.targetPurchasePriceHeloc),
      targetPurchasePriceConventional: g(f.targetPurchasePriceConventional, 0),
      targetPurchasePriceHeloc: g(f.targetPurchasePriceHeloc, 0),
      interestRate: g(f.interestRate, d[s].interestRate || 7.5), percentDown: g(f.percentDown, d.conventional.percentDown), loanTerm: g(f.loanTerm, d.conventional.loanTerm),
      closingCosts: g(f.closingCosts, d[s].closingCosts), insurance: g(f.insurance, d[s].insurance), propertyTaxes: g(f.propertyTaxes, d[s].propertyTaxes), otherMisc: g(f.otherMisc, d[s].otherMisc)
    };
    return s === CONFIG.strategies.heloc ? {
      ...base,
      helocRate: g(f.helocRate, d.heloc.helocRate), helocAmount: g(f.helocAmount, base.improvements), helocTerm: g(f.helocTerm, d.heloc.helocTerm),
      seasoningPeriod: g(f.seasoningPeriod, base.renovationPeriod), refinanceRate: g(f.refinanceRate, d.heloc.refinanceRate), arv: g(f.arv, d.heloc.defaultARV)
    } : base;
  }
}

// =====================================================
// FORM DEFAULTS MANAGER
// =====================================================

class FormDefaults {
  static populate(strategy) {
    Utils.logCalculation('Populating form defaults', { strategy });
    
    // Get current values for cross-tab sync
    const currentRent = Utils.getFloatValue(FIELD_IDS.rent);
    const currentImprovements = Utils.getFloatValue(FIELD_IDS.improvements);
    const currentRenovationPeriod = Utils.getFloatValue(FIELD_IDS.renovationPeriod);
    const currentPropertyTaxes = Utils.getFloatValue(FIELD_IDS.propertyTaxes);
    const currentInsurance = Utils.getFloatValue(FIELD_IDS.insurance);
    
    const defaults = CONFIG.defaults[strategy];
    
    // Set common defaults (preserve values when switching tabs)
    if (!currentRent) Utils.setElementValue(FIELD_IDS.rent, defaults.rent);
    if (!currentImprovements) Utils.setElementValue(FIELD_IDS.improvements, defaults.improvements);
    if (!currentRenovationPeriod) Utils.setElementValue(FIELD_IDS.renovationPeriod, defaults.renovationPeriod);
    
    // Handle property taxes: prioritize extracted data
    if (!currentPropertyTaxes) {
      if (appState.currentData && appState.currentData.annualTax) {
        const monthlyTax = Math.round(appState.currentData.annualTax / 12);
        Utils.setElementValue(FIELD_IDS.propertyTaxes, monthlyTax);
        Utils.logCalculation('Using extracted property taxes', { 
          annual: appState.currentData.annualTax, 
          monthly: monthlyTax
        });
      } else {
        Utils.setElementValue(FIELD_IDS.propertyTaxes, defaults.propertyTaxes);
        Utils.logCalculation('Using default property taxes', { 
          defaultValue: defaults.propertyTaxes,
          reason: !appState.currentData ? 'No current data' : 'No annual tax in data'
        });
      }
    } else {
      Utils.logCalculation('Keeping existing property tax value', { 
        existingValue: currentPropertyTaxes,
        reason: 'User has manually set a value'
      });
    }
    
    // Handle insurance: prioritize extracted data, then calculated, then default
    if (!currentInsurance) {
      if (appState.currentData && appState.currentData.price && appState.currentData.annualInsurance) {
        const monthlyInsurance = Math.round(appState.currentData.annualInsurance / 12);
        Utils.setElementValue(FIELD_IDS.insurance, monthlyInsurance);
        Utils.logCalculation('Using extracted insurance from property data', { 
          annual: appState.currentData.annualInsurance, 
          monthly: monthlyInsurance 
        });
      } else if (appState.currentData && appState.currentData.price) {
        // Calculate insurance based on property price and rate
        const insuranceRate = CONFIG.defaults.insuranceRate || SettingsManager.DEFAULT_SETTINGS.insuranceRate;
        const annualInsurance = Math.round(appState.currentData.price * insuranceRate / 100);
        const monthlyInsurance = Math.round(annualInsurance / 12);
        Utils.setElementValue(FIELD_IDS.insurance, monthlyInsurance);
        Utils.logCalculation('Using calculated insurance based on rate', { 
          propertyPrice: appState.currentData.price,
          insuranceRate: insuranceRate,
          monthlyInsurance: monthlyInsurance 
        });
      } else {
        Utils.setElementValue(FIELD_IDS.insurance, defaults.insurance);
        Utils.logCalculation('Using default insurance', { 
          defaultValue: defaults.insurance 
        });
      }
    } else {
      Utils.logCalculation('Keeping existing insurance value', { 
        existingValue: currentInsurance 
      });
    }
    
    // Set strategy-specific defaults
    Object.entries(defaults).forEach(([key, value]) => {
      if (['rent', 'improvements', 'renovationPeriod', 'propertyTaxes', 'insurance'].includes(key)) {
        // Property taxes and insurance are handled earlier in the method
        return;
      }
      
      if (FIELD_IDS[key]) {
        Utils.setElementValue(FIELD_IDS[key], value);
      }
    });
    
    // HELOC-specific setup
    if (strategy === CONFIG.strategies.heloc) {
      this.setupHelocDefaults();
    }
  }
  
  static setupHelocDefaults() {
    // Sync HELOC amount with improvements
    const improvements = Utils.getFloatValue(FIELD_IDS.improvements);
    if (improvements > 0) {
      Utils.setElementValue(FIELD_IDS.helocAmount, improvements);
    }
    
    // Sync seasoning period with renovation period
    const renovationPeriod = Utils.getFloatValue(FIELD_IDS.renovationPeriod);
    if (renovationPeriod > 0) {
      Utils.setElementValue(FIELD_IDS.seasoningPeriod, renovationPeriod);
    }
  }
}

// =====================================================
// ARV CALCULATOR
// =====================================================

class ARVCalculator {
  constructor(currentStrategy, currentData) {
    this.currentStrategy = currentStrategy;
    this.currentData = currentData;
  }

  update(overridePurchasePrice = null, forceUpdate = false) {
    if (this.currentStrategy !== CONFIG.strategies.heloc) {
      Utils.logCalculation('ARV calculation skipped', { reason: 'not HELOC strategy' });
      return;
    }
    
    const arvField = Utils.getElement(FIELD_IDS.arv);
    if (!arvField) {
      Utils.logCalculation('ARV calculation failed', { reason: 'ARV field not found' });
      return;
    }
    
    const purchasePrice = this.getPurchasePrice(overridePurchasePrice);
    if (!purchasePrice || purchasePrice <= 0) {
      Utils.logCalculation('ARV calculation failed', { reason: 'no valid purchase price' });
      return;
    }
    
    const calculatedARV = purchasePrice / CONFIG.thresholds.refinanceLTV;
    
    Utils.logCalculation('ARV Calculation', {
      purchasePrice: Utils.formatCurrency(purchasePrice),
      formula: `Purchase Price / ${CONFIG.thresholds.refinanceLTV}`,
      calculatedARV: Utils.formatCurrency(calculatedARV)
    });
    
    if (this.shouldUpdateARV(arvField, calculatedARV, overridePurchasePrice, forceUpdate)) {
      arvField.value = Math.round(calculatedARV);
      Utils.logCalculation('ARV Updated', { newValue: Utils.formatCurrency(calculatedARV) });
    }
  }
  
  getPurchasePrice(overridePurchasePrice) {
    if (overridePurchasePrice && overridePurchasePrice > 0) {
      Utils.logCalculation('Using override purchase price for ARV', overridePurchasePrice);
      return overridePurchasePrice;
    }
    
    const targetPurchasePrice = Utils.getFloatValue(FIELD_IDS.targetPurchasePriceHeloc);
    if (targetPurchasePrice > 0) {
      Utils.logCalculation('Using HELOC target purchase price for ARV', targetPurchasePrice);
      return targetPurchasePrice;
    }
    
    if (this.currentData?.price) {
      Utils.logCalculation('Using asking price for ARV', this.currentData.price);
      return this.currentData.price;
    }
    
    return 0;
  }
  
  shouldUpdateARV(arvField, calculatedARV, overridePurchasePrice, forceUpdate) {
    const currentARV = Utils.getFloatValue(FIELD_IDS.arv);
    const isUserModified = Utils.isUserEntered(arvField);
    
    Utils.logCalculation('ARV Update Check', {
      current: currentARV,
      calculated: Math.round(calculatedARV),
      userModified: isUserModified,
      override: !!overridePurchasePrice,
      force: forceUpdate
    });
    
    return !isUserModified && (
      currentARV === 0 || 
      currentARV === CONFIG.defaults.heloc.defaultARV || 
      overridePurchasePrice || 
      forceUpdate
    );
  }
}

// =====================================================
// TARGET PRICE CALCULATORS
// =====================================================

class TargetPriceCalculator {
  static calculateConventional(askingPrice, annualTax, params) {
    const targetROI = params.targetROI / 100;
    Utils.logCalculation('Calculating conventional target price', { targetROI: targetROI * 100 });
    
    return this.binarySearch(askingPrice, annualTax, params, targetROI, CONFIG.strategies.conventional);
  }
  
  static calculateHeloc(askingPrice, annualTax, params) {
    const targetROI = params.targetROI / 100;
    Utils.logCalculation('Calculating HELOC target price', { 
      targetROI: targetROI * 100,
      initialParams: { 
        improvements: params.improvements, 
        helocAmount: params.helocAmount, 
        arv: params.arv 
      }
    });
    
    return this.binarySearch(askingPrice, annualTax, params, targetROI, CONFIG.strategies.heloc);
  }
  
  static binarySearch(askingPrice, annualTax, params, targetROI, strategy) {
    const range = CONFIG.searchRanges[strategy];
    let low = askingPrice * range.lowMultiplier;
    let high = askingPrice * range.highMultiplier;
    let bestPrice = askingPrice;
    let bestROI = 0;
    
    Utils.logCalculation(`${strategy.toUpperCase()} binary search`, {
      range: `${Utils.formatCurrency(low)} - ${Utils.formatCurrency(high)}`
    });
    
    for (let iterations = 0; iterations < CONFIG.thresholds.binarySearchIterations; iterations++) {
      const testPrice = (low + high) / 2;
      const testParams = { ...params, targetPurchasePrice: testPrice };
      
      if (strategy === CONFIG.strategies.heloc) {
        testParams.arv = testPrice / CONFIG.thresholds.refinanceLTV;
      }
      
      const calculator = strategy === CONFIG.strategies.conventional 
        ? ConventionalROICalculator 
        : HelocROICalculator;
      const result = calculator.calculate(askingPrice, annualTax, testParams);
      
      // Track best result
      if (Math.abs(result.roi / 100 - targetROI) < Math.abs(bestROI / 100 - targetROI)) {
        bestPrice = testPrice;
        bestROI = result.roi;
      }
      
      // Check convergence
      if (Math.abs(result.roi / 100 - targetROI) < CONFIG.thresholds.convergenceThreshold) {
        bestPrice = testPrice;
        Utils.logCalculation(`${strategy.toUpperCase()} target price converged`, {
          price: Utils.formatCurrency(bestPrice),
          iterations
        });
        break;
      }
      
      // Adjust search range
      if (result.roi / 100 < targetROI) {
        high = testPrice; // Need lower purchase price
      } else {
        low = testPrice; // Can afford higher purchase price
      }
      
      // Check range convergence
      if ((high - low) < CONFIG.thresholds.rangeConvergenceThreshold) {
        Utils.logCalculation(`${strategy.toUpperCase()} search range converged`, { iterations });
        break;
      }
    }
    
    Utils.logCalculation(`${strategy.toUpperCase()} target price result`, {
      price: Utils.formatCurrency(bestPrice),
      roi: `${bestROI.toFixed(2)}%`
    });
    return bestPrice;
  }
}

// =====================================================
// ROI CALCULATION ENGINES
// =====================================================

class ConventionalROICalculator {
  static calculate(askingPrice, annualTax, params) {
    // Determine purchase price
    let purchasePrice;
    let isTargetPrice = false;
    
    if (params.targetPurchasePrice && params.targetPurchasePrice > 0) {
      purchasePrice = params.targetPurchasePrice;
    } else {
      purchasePrice = TargetPriceCalculator.calculateConventional(askingPrice, annualTax, params);
      isTargetPrice = true;
    }
    
    const downPayment = purchasePrice * (params.percentDown / 100);
    const loanAmount = purchasePrice - downPayment;
    
    // Calculate mortgage payment (P&I only)
    const mortgagePayment = MortgageCalculator.calculateMonthlyPayment(
      loanAmount, 
      params.interestRate, 
      params.loanTerm
    );
    
    // Calculate holding costs during renovation
    const holdingCosts = MortgageCalculator.calculateHoldingCosts(mortgagePayment, params.renovationPeriod);
    
    // Total cash invested
    const totalCashIn = downPayment + params.closingCosts + params.improvements + holdingCosts;
    
    // Monthly breakdown
    const monthlyCashFlow = params.rent - mortgagePayment - params.propertyTaxes - 
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
        taxes: params.propertyTaxes,
        insurance: params.insurance,
        other: params.otherMisc
      }
    };
  }
}

class HelocROICalculator {
  static calculate(askingPrice, annualTax, params) {
    // Determine purchase price
    let purchasePrice;
    
    if (params.targetPurchasePrice && params.targetPurchasePrice > 0) {
      purchasePrice = params.targetPurchasePrice;
    } else {
      purchasePrice = askingPrice;
    }
    
    // Total holding period: renovation + 1 month for refinancing (seasoning overlaps with renovation)
    const totalHoldingPeriod = params.renovationPeriod + 1;
    
    // Initial cash investment (all cash purchase)
    const initialCashIn = purchasePrice + params.closingCosts + params.improvements;
    
    // HELOC holding costs during renovation + seasoning + refinancing (1 extra month)
    const helocMonthlyPayment = MortgageCalculator.calculateMonthlyPayment(
      params.helocAmount,
      params.helocRate,
      params.helocTerm
    );
    const holdingCosts = MortgageCalculator.calculateHoldingCosts(helocMonthlyPayment, totalHoldingPeriod);
    const totalCashIn = initialCashIn + holdingCosts;
    
    // Refinance calculations - with time-based constraint
    const maxRefinanceByTime = params.renovationPeriod < CONFIG.thresholds.seasoningMonths 
      ? purchasePrice 
      : Infinity;
    const maxRefinanceByARV = params.arv * CONFIG.thresholds.refinanceLTV;
    const refinanceLoanAmount = Math.min(maxRefinanceByTime, maxRefinanceByARV);
    
    Utils.logCalculation('Refinance calculation', {
      renovationPeriod: `${params.renovationPeriod} months`,
      purchasePriceLimit: params.renovationPeriod < CONFIG.thresholds.seasoningMonths 
        ? `${Utils.formatCurrency(purchasePrice)}` 
        : 'No limit',
      arvLimit: `${Utils.formatCurrency(maxRefinanceByARV)}`,
      finalAmount: `${Utils.formatCurrency(refinanceLoanAmount)}`
    });
    
    const cashOut = refinanceLoanAmount - CONFIG.thresholds.refinanceClosingCosts;
    const finalCashIn = totalCashIn - cashOut;
    
    // Calculate refinance mortgage payment
    const mortgagePayment = MortgageCalculator.calculateMonthlyPayment(
      refinanceLoanAmount,
      params.refinanceRate,
      30 // 30-year refinance
    );
    
    // Monthly breakdown (after refinance - HELOC is paid off)
    const monthlyCashFlowWithHeloc = params.rent - mortgagePayment - params.propertyTaxes - 
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
        taxes: params.propertyTaxes,
        insurance: params.insurance,
        other: params.otherMisc
      }
    };
  }
}

// =====================================================
// RESULTS FORMATTING ENGINE
// =====================================================

class ResultsFormatter {
  static format(calculation, isHeloc) {
    const roiColor = Utils.getROIColor(calculation.roi);
    return `
      <div class="results">
        <div class="roi-highlight" style="color: ${roiColor}">${calculation.roi.toFixed(1)}% Annual ROI</div>
        <div style="display: flex; gap: 20px; margin-top: 15px;">
          <div style="flex: 1; min-width: 250px;">
            ${this.formatSummary(calculation, isHeloc)}
            ${this.formatCashFlow(calculation, isHeloc)}
          </div>
          <div style="flex: 1; min-width: 250px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 5px; padding: 10px; font-size: 11px;">
            <strong>Step-by-Step Calculations:</strong><br><br>
            ${isHeloc ? this.formatHelocDetails(calculation) : this.formatConventionalDetails(calculation)}
          </div>
        </div>
      </div>`;
  }
  
  static formatSummary(calculation, isHeloc) {
    const discountInfo = calculation.askingPrice && calculation.discountPercent !== undefined ? 
      ` <span style="color: ${calculation.discountPercent > 0 ? CONFIG.colors.good : CONFIG.colors.danger}">
        (${calculation.discountPercent.toFixed(1)}% ${calculation.isTargetPrice ? 'discount for 10% ROI' : `vs asking ${Utils.formatCurrency(calculation.askingPrice)}`})
       </span>` : '';
    
    const helocInfo = isHeloc ? `<br><strong>Cash Out (Refinance):</strong> ${Utils.formatCurrency(calculation.cashOut)}
                                <br><strong>Final Cash In:</strong> ${Utils.formatCurrency(calculation.finalCashIn)}
                                <br><strong>ARV:</strong> ${Utils.formatCurrency(calculation.arv)}` : '';
    
    return `<div class="details">
      <strong>Purchase:</strong> ${Utils.formatCurrency(calculation.purchasePrice)}${discountInfo}
      <br><strong>Total Cash In:</strong> ${Utils.formatCurrency(calculation.totalCashIn)}${helocInfo}
      <br><strong>Holding Costs:</strong> ${Utils.formatCurrency(calculation.holdingCosts)}
      <br><strong>Payback Period:</strong> ${calculation.paybackPeriod.toFixed(1)} years
    </div>`;
  }
  
  static formatCashFlow(calculation, isHeloc) {
    const cashFlow = calculation[isHeloc ? 'monthlyCashFlowWithHeloc' : 'monthlyCashFlow'];
    const cashFlowColor = cashFlow >= 0 ? CONFIG.colors.good : CONFIG.colors.danger;
    const helocNote = isHeloc ? `<div style="font-size: 10px; color: #666; margin-top: 2px;">(HELOC paid off at refinance)</div>` : '';
    
    return `<div class="details" style="margin-top: 15px;">
      <strong>Monthly Cash Flow:</strong><br>
      <div class="cash-flow-income">
        <div style="font-weight: bold;">+ Income:</div>
        <div style="margin-left: 15px;">+ Rent: $${calculation.details.rent}</div>
      </div>
      <div class="cash-flow-expenses">
        <div style="font-weight: bold;">- Expenses:</div>
        <div style="margin-left: 15px;">
          - Mortgage: $${Math.round(calculation.mortgagePayment)}<br>
          - Taxes: $${Math.round(calculation.details.taxes)}<br>
          - Insurance: $${calculation.details.insurance}<br>
          - Other: $${calculation.details.other}
        </div>
      </div>
      <div class="cash-flow-net ${cashFlow >= 0 ? 'cash-flow-positive' : 'cash-flow-negative'}">
        <div style="font-weight: bold;">= Net Cash Flow${isHeloc ? ' (post-refinance)' : ''}:</div>
        <div style="font-size: 16px; font-weight: bold; color: ${cashFlowColor};">$${Math.round(cashFlow)} per month</div>
        ${helocNote}
      </div>
    </div>`;
  }
  
  static formatHelocDetails(calculation) {
    const totalHoldingPeriod = (calculation.holdingCosts / calculation.helocPayment);
    const renovationPeriod = Math.round(totalHoldingPeriod - 1);
    const hasTimeConstraint = renovationPeriod < CONFIG.thresholds.seasoningMonths;
    
    return `
      <strong>INITIAL INVESTMENT:</strong><br>
      - Purchase Price: ${Utils.formatCurrency(calculation.purchasePrice)}<br>
      - Closing Costs: $1,000<br>
      - Improvements: ${Utils.formatCurrency(calculation.totalCashIn - calculation.purchasePrice - 1000 - calculation.holdingCosts)}<br>
      - HELOC Payments (holding period only - ${Math.round(totalHoldingPeriod)} months): ${Utils.formatCurrency(calculation.holdingCosts)}<br>
      <small style="color: #666;">  * HELOC paid off at refinance completion</small><br>
      <strong>= Total Cash In: ${Utils.formatCurrency(calculation.totalCashIn)}</strong><br><br>
      
      <strong>REFINANCE RECOVERY:</strong><br>
      - ARV (After Repair Value): ${Utils.formatCurrency(calculation.arv)}<br>
      - Renovation Period: ${renovationPeriod} months ${hasTimeConstraint ? '(under 6 months)' : '(6+ months)'}<br>
      - Standard Refinance Limit: 70% of ARV = ${Utils.formatCurrency(Math.round(calculation.arv * CONFIG.thresholds.refinanceLTV))}<br>
      ${hasTimeConstraint ? `- Time Constraint: Cannot exceed purchase price = ${Utils.formatCurrency(calculation.purchasePrice)}<br>` : ''}
      - Actual Refinance Loan Amount: ${Utils.formatCurrency(Math.round(calculation.refinanceLoanAmount))}<br>
      - Refinance Closing Costs: -${Utils.formatCurrency(CONFIG.thresholds.refinanceClosingCosts)}<br>
      <strong>= Cash Out: ${Utils.formatCurrency(calculation.cashOut)}</strong><br><br>
      
      <strong>FINAL INVESTMENT:</strong><br>
      - Total Cash In: ${Utils.formatCurrency(calculation.totalCashIn)}<br>
      - Cash Out: -${Utils.formatCurrency(calculation.cashOut)}<br>
      <strong>= Final Cash In: ${Utils.formatCurrency(calculation.finalCashIn)}</strong><br><br>
      
      <strong>ROI CALCULATION:</strong><br>
      - Monthly Net Cash Flow (post-refinance): $${Math.round(calculation.monthlyCashFlowWithHeloc)}<br>
      - Annual Cash Flow: ${Utils.formatCurrency(Math.round(calculation.annualCashFlow))}<br>
      - Final Cash In: ${Utils.formatCurrency(calculation.finalCashIn)}<br>
      <strong>= ROI: ${Utils.formatCurrency(Math.round(calculation.annualCashFlow))} / ${Utils.formatCurrency(calculation.finalCashIn)} = ${calculation.roi.toFixed(1)}%</strong>`;
  }
  
  static formatConventionalDetails(calculation) {
    return `
      <strong>TOTAL INVESTMENT:</strong><br>
      - Down Payment: ${Utils.formatCurrency(calculation.downPayment)}<br>
      - Closing Costs: $5,000<br>
      - Improvements: ${Utils.formatCurrency(calculation.totalCashIn - calculation.downPayment - 5000 - calculation.holdingCosts)}<br>
      - Holding Costs (${Math.round(calculation.holdingCosts / calculation.mortgagePayment)} months): ${Utils.formatCurrency(calculation.holdingCosts)}<br>
      <strong>= Total Cash In: ${Utils.formatCurrency(calculation.totalCashIn)}</strong><br><br>
      
      <strong>LOAN DETAILS:</strong><br>
      - Purchase Price: ${Utils.formatCurrency(calculation.purchasePrice)}<br>
      - Down Payment: ${Utils.formatCurrency(calculation.downPayment)}<br>
      - Loan Amount: ${Utils.formatCurrency(calculation.loanAmount)}<br>
      - Monthly Mortgage: $${Math.round(calculation.mortgagePayment)}<br><br>
      
      <strong>ROI CALCULATION:</strong><br>
      - Monthly Net Cash Flow: $${Math.round(calculation.monthlyCashFlow)}<br>
      - Annual Cash Flow: ${Utils.formatCurrency(Math.round(calculation.annualCashFlow))}<br>
      - Total Cash In: ${Utils.formatCurrency(calculation.totalCashIn)}<br>
      <strong>= ROI: ${Utils.formatCurrency(Math.round(calculation.annualCashFlow))} / ${Utils.formatCurrency(calculation.totalCashIn)} = ${calculation.roi.toFixed(1)}%</strong>`;
  }
}

// =====================================================
// GLOBAL STATE MANAGER
// =====================================================

class AppState {
  constructor() {
    this.currentData = null;
    this.currentStrategy = CONFIG.strategies.conventional;
    this.formParameters = new FormParameters(this.currentStrategy);
    this.arvCalculator = null;
  }
  
  setData(data) {
    this.currentData = data;
    this.arvCalculator = new ARVCalculator(this.currentStrategy, this.currentData);
  }
  
  setStrategy(strategy) {
    this.currentStrategy = strategy;
    this.formParameters = new FormParameters(strategy);
    if (this.currentData) {
      this.arvCalculator = new ARVCalculator(strategy, this.currentData);
    }
  }
  
  getFormParams() {
    return this.formParameters.getAll();
  }
  
  updateARV(overridePurchasePrice = null, forceUpdate = false) {
    if (this.arvCalculator) {
      this.arvCalculator.update(overridePurchasePrice, forceUpdate);
    }
  }
  
  calculateResults() {
    if (!this.currentData) return null;
    
    const params = this.getFormParams();
    
    Utils.logCalculation('updateResults called', {
      strategy: this.currentStrategy,
      targetPurchasePrice: params.targetPurchasePrice
    });
    
    let calculation;
    if (this.currentStrategy === CONFIG.strategies.conventional) {
      calculation = ConventionalROICalculator.calculate(this.currentData.price, this.currentData.annualTax, params);
    } else {
      // For HELOC, check if we need to calculate target price
      if (!params.targetPurchasePrice || params.targetPurchasePrice <= 0) {
        Utils.logCalculation('HELOC auto-calculating target price', {});
        
        // Calculate target price for 10% ROI
        const targetPrice = TargetPriceCalculator.calculateHeloc(this.currentData.price, this.currentData.annualTax, params);
        
        // Update params with the target price AND calculated ARV for the ROI calculation
        const calculatedARV = targetPrice / CONFIG.thresholds.refinanceLTV;
        Utils.logCalculation('Final ARV calculation', {
          targetPrice: Math.round(targetPrice),
          calculatedARV: Math.round(calculatedARV)
        });
        
        const paramsWithTarget = { 
          ...params, 
          targetPurchasePrice: targetPrice,
          arv: calculatedARV
        };
        calculation = HelocROICalculator.calculate(this.currentData.price, this.currentData.annualTax, paramsWithTarget);
        calculation.isTargetPrice = true;
        calculation.purchasePrice = targetPrice;
      } else {
        Utils.logCalculation('HELOC using user-entered price', params.targetPurchasePrice);
        calculation = HelocROICalculator.calculate(this.currentData.price, this.currentData.annualTax, params);
        calculation.isTargetPrice = false;
        calculation.purchasePrice = params.targetPurchasePrice;
      }
    }
    
    Utils.logCalculation('calculation result', {
      roi: calculation.roi.toFixed(1),
      isTargetPrice: calculation.isTargetPrice
    });
    
    return calculation;
  }
}

// Initialize global state
const appState = new AppState();

// =====================================================
// UI MANAGER & EVENT HANDLERS
// =====================================================

class UIManager {
  static updateResults() {
    const calculation = appState.calculateResults();
    if (!calculation) return;
    
    const output = Utils.getElement("output");
    output.innerHTML = ResultsFormatter.format(calculation, appState.currentStrategy === CONFIG.strategies.heloc);
    this.showExportButton();
    this.updateTargetPriceField(calculation);
  }
  
  static showExportButton() {
    if (typeof XLSX !== 'undefined') Utils.getElement("export-btn").style.display = "block";
  }
  
  static hideExportButton() {
    Utils.getElement("export-btn").style.display = "none";
  }
  
  static updateTargetPriceField(calculation) {
    if (!calculation.isTargetPrice) return;
    
    const fieldId = appState.currentStrategy === CONFIG.strategies.conventional ? 
      FIELD_IDS.targetPurchasePriceConventional : FIELD_IDS.targetPurchasePriceHeloc;
    const field = Utils.getElement(fieldId);
    const newValue = Math.round(calculation.purchasePrice);
    
    field.value = newValue;
    Utils.markAsAutoCalculated(field);
    
    if (appState.currentStrategy === CONFIG.strategies.heloc) {
      appState.updateARV(newValue, true);
    }
  }
  
  static showError(message) {
    Utils.getElement("output").innerHTML = `<div class="error">${message}</div>`;
    this.hideExportButton();
  }
  
  static showLoading(message) {
    Utils.getElement("output").innerHTML = `<div class="loading">${message}</div>`;
    this.hideExportButton();
  }
  
  static showPropertyInfo(data) {
    const propertyInfo = Utils.getElement("property-info");
    propertyInfo.style.display = "block";
    
    const monthlyTax = data.annualTax ? Math.round(data.annualTax / 12) : Math.round(data.price * CONFIG.thresholds.estimatedTaxRate / 12);
    const taxInfo = data.annualTax ? `$${monthlyTax} (extracted)` : `<span style="color: ${CONFIG.colors.warning};">~$${monthlyTax} (estimated)</span>`;
    
    let insuranceInfo;
    if (data.annualInsurance && data.annualInsurance > 0) {
      const monthlyInsurance = Math.round(data.annualInsurance / 12);
      const insuranceRate = CONFIG.defaults.insuranceRate || SettingsManager.DEFAULT_SETTINGS.insuranceRate;
      const calculatedAnnual = Math.round(data.price * insuranceRate / 100);
      const isExtracted = Math.abs(data.annualInsurance - calculatedAnnual) > 50;
      insuranceInfo = isExtracted ? `$${monthlyInsurance} (extracted)` : 
        `<span style="color: ${CONFIG.colors.warning};">~$${monthlyInsurance} (calculated from ${insuranceRate}% rate)</span>`;
    } else {
      insuranceInfo = `<span style="color: ${CONFIG.colors.warning};">~$${CONFIG.defaults.conventional.insurance} (fallback default)</span>`;
    }
    
    const rentInfo = data.monthlyRent && data.monthlyRent > 0 ? 
      `<br><strong>Rent Zestimate:</strong> ${Utils.formatCurrency(data.monthlyRent)}/month (extracted)` : '';
    
    propertyInfo.innerHTML = `
      <strong>Property:</strong> ${Utils.formatCurrency(data.price)} asking price<br>
      <strong>Monthly Property Taxes:</strong> ${taxInfo}<br>
      <strong>Monthly Insurance:</strong> ${insuranceInfo}${rentInfo}
    `;
  }
}

class EventHandlers {
  static initializeAll() {
    this.initializeTabSwitching();
    this.initializeAdvancedToggle();
    this.initializeTargetPriceHandling();
    this.initializeCalculateButton();
    this.initializeExportButton();
    this.initializeRecalculateButton();
    this.initializeFormInputs();
    this.initializeSpecialFields();
    this.initializeDataExtraction();
    this.initializeSettings();
  }
  
  static initializeTabSwitching() {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Update active tab
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const strategy = tab.dataset.strategy;
        
        if (strategy === 'settings') {
          this.showSettingsTab();
        } else {
          this.showStrategyTab(strategy);
        }
      });
    });
  }
  
  static showSettingsTab() {
    const elements = this.getTabElements();
    
    // Hide main interface, show settings
    elements.inputForm.style.display = 'none';
    elements.outputDiv.style.display = 'none';
    elements.calculateBtn.style.display = 'none';
    elements.settingsContent.style.display = 'block';
    UIManager.hideExportButton();
    
    // Enable settings inputs
    elements.settingsContent.querySelectorAll('input').forEach(input => {
      Object.assign(input.style, { pointerEvents: 'auto', userSelect: 'auto' });
      input.disabled = input.readOnly = false;
    });
    
    // Load settings
    setTimeout(() => {
      SettingsManager.loadSettings()
        .then(settings => SettingsManager.populateSettingsForm(settings))
        .catch(error => console.error('🏠 Error loading settings:', error));
    }, 100);
  }
  
  static showStrategyTab(strategy) {
    const elements = this.getTabElements();
    
    // Show main interface, hide settings
    elements.settingsContent.style.display = 'none';
    elements.inputForm.style.display = 'block';
    elements.outputDiv.style.display = 'block';
    elements.calculateBtn.style.display = 'block';
    
    // Handle strategy change
    const oldStrategy = appState.currentStrategy;
    appState.setStrategy(strategy);
    Utils.logCalculation('Strategy changed', { from: oldStrategy, to: appState.currentStrategy });
    
    this.updateStrategyUI();
    FormDefaults.populate(appState.currentStrategy);
    
    if (appState.currentData) UIManager.updateResults();
  }
  
  static getTabElements() {
    return {
      inputForm: document.getElementById('input-form'),
      settingsContent: document.getElementById('settings-content'),
      calculateBtn: document.getElementById('calculate-btn'),
      outputDiv: document.getElementById('output')
    };
  }
  
  static updateStrategyUI() {
    const helocAdvanced = Utils.getElement('heloc-advanced');
    const conventionalField = Utils.getElement(FIELD_IDS.targetPurchasePriceConventional);
    const helocField = Utils.getElement(FIELD_IDS.targetPurchasePriceHeloc);
    
    if (appState.currentStrategy === CONFIG.strategies.heloc) {
      helocAdvanced.classList.remove('hidden');
      conventionalField.classList.add('hidden');
      helocField.classList.remove('hidden');
    } else {
      helocAdvanced.classList.add('hidden');
      conventionalField.classList.remove('hidden');
      helocField.classList.add('hidden');
    }
  }
  
  static initializeAdvancedToggle() {
    Utils.getElement('toggle-advanced').addEventListener('click', () => {
      const advancedSection = Utils.getElement('advanced-section');
      const toggleButton = Utils.getElement('toggle-advanced');
      
      if (advancedSection.classList.contains('hidden')) {
        advancedSection.classList.remove('hidden');
        toggleButton.textContent = 'Hide Advanced Parameters';
      } else {
        advancedSection.classList.add('hidden');
        toggleButton.textContent = 'Show Advanced Parameters';
      }
    });
  }
  
  static initializeTargetPriceHandling() {
    [FIELD_IDS.targetPurchasePriceConventional, FIELD_IDS.targetPurchasePriceHeloc].forEach(fieldId => {
      const field = Utils.getElement(fieldId);
      
      field.addEventListener('input', function() {
        Utils.markAsUserEntered(this);
        
        // Update default ARV when target purchase price changes (HELOC strategy only)
        if (appState.currentStrategy === CONFIG.strategies.heloc && fieldId === FIELD_IDS.targetPurchasePriceHeloc) {
          const purchasePrice = parseFloat(this.value) || 0;
          if (purchasePrice > 0) {
            Utils.logCalculation('Purchase price manually changed', purchasePrice);
            appState.updateARV(purchasePrice, false);
          }
        }
        
        if (appState.currentData) {
          UIManager.updateResults();
        }
      });
      
      field.addEventListener('focus', function() {
        if (!Utils.isUserEntered(this)) {
          this.style.background = '#ffffff';
        }
      });
      
      field.addEventListener('blur', function() {
        if (!this.value && !Utils.isUserEntered(this)) {
          Utils.markAsAutoCalculated(this);
        }
      });
    });
  }
  
  static initializeCalculateButton() {
    Utils.getElement('calculate-btn').addEventListener('click', () => {
      UIManager.updateResults();
    });
  }
  
  static initializeExportButton() {
    const exportBtn = Utils.getElement('export-btn');
    
    // Check if XLSX library is loaded
    if (typeof XLSX === 'undefined') {
      console.warn('🏠 XLSX library not available, hiding export button');
      exportBtn.style.display = 'none';
      return;
    }
    
    exportBtn.addEventListener('click', async () => {
      const calculation = appState.calculateResults();
      if (calculation) {
        try {
          await ExcelExporter.export(calculation, appState.currentData, appState.currentStrategy);
        } catch (error) {
          console.error('🏠 Export error:', error);
          alert('Error exporting to Excel. Please try again.');
        }
      } else {
        alert('No calculation data available. Please calculate ROI first.');
      }
    });
  }
  
  static initializeRecalculateButton() {
    Utils.getElement('recalculate-target-price').addEventListener('click', () => {
      const targetPriceFieldId = appState.currentStrategy === CONFIG.strategies.conventional 
        ? FIELD_IDS.targetPurchasePriceConventional 
        : FIELD_IDS.targetPurchasePriceHeloc;
      
      const targetPriceField = Utils.getElement(targetPriceFieldId);
      if (targetPriceField) {
        targetPriceField.value = '';
        Utils.markAsAutoCalculated(targetPriceField);
        
        Utils.logCalculation('User requested target price recalculation', {
          strategy: appState.currentStrategy
        });
        
        if (appState.currentData) {
          UIManager.updateResults();
        }
      }
    });
  }
  
  static initializeFormInputs() {
    // Auto-calculate on key input changes with cross-tab sync
    [FIELD_IDS.rent, FIELD_IDS.improvements, FIELD_IDS.renovationPeriod, FIELD_IDS.propertyTaxes, FIELD_IDS.insurance].forEach(fieldId => {
      Utils.getElement(fieldId).addEventListener('input', () => {
        this.handleSpecialInputLogic(fieldId);
        this.clearAutoCalculatedTargetPrice();
        
        if (appState.currentData) {
          UIManager.updateResults();
        }
      });
    });
  }
  
  static handleSpecialInputLogic(fieldId) {
    if (fieldId === FIELD_IDS.improvements) {
      // Update HELOC amount automatically
      const improvementsValue = Utils.getFloatValue(FIELD_IDS.improvements);
      if (improvementsValue > 0) {
        Utils.setElementValue(FIELD_IDS.helocAmount, improvementsValue);
      }
      
      // Update default ARV when improvements change (HELOC strategy only)
      if (appState.currentStrategy === CONFIG.strategies.heloc) {
        appState.updateARV();
      }
    }
    
    if (fieldId === FIELD_IDS.renovationPeriod) {
      // Update seasoning period automatically
      const renovationPeriodValue = Utils.getFloatValue(FIELD_IDS.renovationPeriod);
      if (renovationPeriodValue > 0) {
        Utils.setElementValue(FIELD_IDS.seasoningPeriod, renovationPeriodValue);
      }
    }
  }
  
  static clearAutoCalculatedTargetPrice() {
    const targetPriceFieldId = appState.currentStrategy === CONFIG.strategies.conventional 
      ? FIELD_IDS.targetPurchasePriceConventional 
      : FIELD_IDS.targetPurchasePriceHeloc;
    
    const targetPriceField = Utils.getElement(targetPriceFieldId);
    if (targetPriceField && !Utils.isUserEntered(targetPriceField)) {
      targetPriceField.value = '';
      Utils.markAsAutoCalculated(targetPriceField);
      Utils.logCalculation('Clearing auto-calculated target price due to input change', {});
    }
  }
  
  static initializeSpecialFields() {
    // HELOC amount field sync
    Utils.getElement(FIELD_IDS.helocAmount).addEventListener('focus', () => {
      const improvementsValue = Utils.getFloatValue(FIELD_IDS.improvements);
      const helocAmountField = Utils.getElement(FIELD_IDS.helocAmount);
      
      if (improvementsValue > 0 && (!helocAmountField.value || helocAmountField.value == 10000)) {
        helocAmountField.value = improvementsValue;
      }
    });
    
    // ARV field tracking
    Utils.getElement(FIELD_IDS.arv).addEventListener('input', function() {
      Utils.markAsUserEntered(this);
      Utils.logCalculation('ARV field manually modified by user', {});
      
      if (appState.currentData) {
        UIManager.updateResults();
      }
    });
  }
  
  static initializeDataExtraction() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      
      if (!this.isSupportedSite(currentTab.url)) {
        UIManager.showError('Please navigate to a Redfin or Zillow property page.');
        return;
      }

      UIManager.showLoading('Extracting property data...');
      this.tryExtractData(currentTab.id);
    });
  }
  
  static isSupportedSite(url) {
    return url.includes('redfin.com') || url.includes('zillow.com');
  }
  
  static tryExtractData(tabId, attempt = 1, maxAttempts = 3) {
    Utils.logCalculation(`Data extraction attempt ${attempt}`, {});
    
    chrome.tabs.sendMessage(tabId, { type: "getListingData" }, (data) => {
      if (chrome.runtime.lastError) {
        this.handleExtractionError(tabId, attempt, maxAttempts);
      } else if (data?.error) {
        UIManager.showError(`Extraction error: ${data.error}<br><small>Try reloading the page and opening the extension again.</small>`);
      } else {
        Utils.logCalculation(`Data extraction successful on attempt ${attempt}`, data);
        this.handleDataReceived(data);
      }
    });
  }
  
  static handleExtractionError(tabId, attempt, maxAttempts) {
    const errorMessages = {
      1: () => {
        UIManager.showLoading('Loading extension script...');
        chrome.scripting.executeScript({
          target: { tabId },
          files: ['content.js']
        }, () => {
          if (chrome.runtime.lastError) {
            const errorMsg = chrome.runtime.lastError.message || 'Unknown error';
            UIManager.showError(`Error: Could not inject script (${errorMsg}). <br><br><strong>Try these steps:</strong><br>1. Reload this property page<br>2. Open the extension again<br>3. Make sure you're on a Redfin or Zillow listing page`);
            return;
          }
          
          UIManager.showLoading('Script loaded, extracting data...');
          setTimeout(() => this.tryExtractData(tabId, 2, maxAttempts), 1500);
        });
      },
      default: () => {
        if (attempt < maxAttempts) {
          UIManager.showLoading(`Retrying data extraction... (attempt ${attempt})`);
          setTimeout(() => this.tryExtractData(tabId, attempt + 1, maxAttempts), 2000);
        } else {
          UIManager.showError(`
            <strong>Could not extract property data</strong><br><br>
            <strong>Troubleshooting steps:</strong><br>
            1. Make sure you're on a property listing page (not search results)<br>
            2. Reload the property page and try again<br>
            3. Check if the page has fully loaded (no loading spinners)<br>
            4. Try opening the extension on a different property<br><br>
            <small>If the issue persists, this property page may use a different layout.</small>`);
        }
      }
    };
    
    (errorMessages[attempt] || errorMessages.default)();
  }
  
  static clearPropertySpecificFields() {
    // Clear fields that are specific to individual properties
    // These should not persist when moving between different properties
    const propertySpecificFields = [
      FIELD_IDS.rent,
      FIELD_IDS.propertyTaxes,
      FIELD_IDS.insurance,
      FIELD_IDS.askingPrice,
      FIELD_IDS.annualTax,
      FIELD_IDS.targetPurchasePriceConventional,
      FIELD_IDS.targetPurchasePriceHeloc,
      FIELD_IDS.arv
    ];
    
    propertySpecificFields.forEach(fieldId => {
      Utils.setElementValue(fieldId, '');
    });
    
    Utils.logCalculation('Cleared property-specific fields for new property', {
      clearedFields: propertySpecificFields
    });
  }

  static handleDataReceived(data) {
    Utils.logCalculation('Property data received', data);
    
    // Validate extracted data
    const validationResult = this.validatePropertyData(data);
    if (!validationResult.isValid) {
      UIManager.showError(validationResult.errorMessage);
      return;
    }

    // Handle missing data
    this.normalizePropertyData(data);
    
    // Clear property-specific fields to avoid carrying over values from previous properties
    this.clearPropertySpecificFields();

    // Set up the application state
    appState.setData(data);
    UIManager.showPropertyInfo(data);
    Utils.getElement("input-form").style.display = "block";

    // Set initial form defaults and calculate results
    FormDefaults.populate(appState.currentStrategy);
    this.populateRentFromZestimate(data);
    UIManager.updateResults();
  }  static validatePropertyData(data) {
    if (!data || (!data.price && !data.annualTax)) {
      return {
        isValid: false,
        errorMessage: `
          <strong>No property data found</strong><br><br>
          This could happen if:<br>
          - The page layout has changed<br>
          - The page hasn't fully loaded<br>
          - You're not on a property details page<br><br>
          <strong>Try:</strong><br>
          1. Reload the page and wait for it to fully load<br>
          2. Make sure you're on a specific property page (not search results)<br>
          3. Try a different property listing`
      };
    }
    
    if (!data.price) {
      return {
        isValid: false,
        errorMessage: `
          <strong>Property price not found</strong><br><br>
          The extension couldn't find the listing price on this page.<br>
          This might be a sold property or the page layout is different.<br><br>
          <small>Found tax data: ${data.annualTax ? '$' + Utils.formatCurrency(data.annualTax) : 'None'}</small>`
      };
    }
    
    return { isValid: true };
  }
  
  static normalizePropertyData(data) {
    // Handle missing tax data
    if (!data.annualTax) {
      data.annualTax = Math.round(data.price * CONFIG.thresholds.estimatedTaxRate);
    }

    // Handle missing insurance data
    if (!data.annualInsurance || data.annualInsurance <= 0) {
      const insuranceRate = CONFIG.defaults.insuranceRate || SettingsManager.DEFAULT_SETTINGS.insuranceRate;
      data.annualInsurance = Math.round(data.price * insuranceRate / 100);
      
      Utils.logCalculation('Using calculated insurance based on rate', { 
        propertyPrice: data.price,
        insuranceRate: insuranceRate,
        annualInsurance: data.annualInsurance,
        monthlyInsurance: Math.round(data.annualInsurance / 12)
      });
    } else {
      Utils.logCalculation('Using extracted insurance value', { 
        extracted: data.annualInsurance,
        monthly: Math.round(data.annualInsurance / 12)
      });
    }
  }
  
  static populateRentFromZestimate(data) {
    if (!data.monthlyRent || data.monthlyRent <= 0) return;
    
    const rentField = Utils.getElement(FIELD_IDS.rent);
    const currentRent = Utils.getFloatValue(FIELD_IDS.rent);
    
    // Only populate if field is empty or contains default value
    const shouldPopulate = !currentRent || 
      currentRent === CONFIG.defaults.conventional.rent || 
      currentRent === CONFIG.defaults.heloc.rent;
    
    if (shouldPopulate) {
      Utils.setElementValue(FIELD_IDS.rent, data.monthlyRent);
      Utils.logCalculation('Auto-populated rent field with Zestimate', {
        extractedRent: data.monthlyRent,
        previousValue: currentRent
      });
    }
  }

  static initializeSettings() {
    // Load and apply settings on initialization
    SettingsManager.loadSettings()
      .then(settings => {
        SettingsManager.updateConfigWithSettings(settings);
        Utils.logCalculation('Settings loaded and applied', settings);
      })
      .catch(error => console.error('🏠 Error in settings initialization:', error));

    // Initialize all settings buttons
    this.initializeSettingsButtons();
    
    // Initialize settings field listeners to sync with advanced options
    this.initializeSettingsFieldListeners();
  }
  
  static initializeSettingsFieldListeners() {
    // Map settings fields to their corresponding advanced option fields
    const fieldMappings = [
      ['defaultInterestRate', 'interestRate'],
      ['defaultHelocRate', 'helocRate'],
      ['defaultRefinanceRate', 'refinanceRate'],
      ['defaultDownPayment', 'percentDown'],
      ['defaultHelocTerm', 'helocTerm'],
      ['defaultSeasoningPeriod', 'seasoningPeriod']
    ];
    
    // Add event listeners to sync values in real-time
    fieldMappings.forEach(([settingsFieldId, advancedFieldId]) => {
      const settingsField = document.getElementById(settingsFieldId);
      if (settingsField) {
        settingsField.addEventListener('input', () => {
          const value = parseFloat(settingsField.value) || 0;
          Utils.setElementValue(advancedFieldId, value);
          Utils.logCalculation(`Settings field ${settingsFieldId} changed, syncing to ${advancedFieldId}`, { value });
        });
      }
    });
  }
  
  static initializeSettingsButtons() {
    const buttons = {
      testSettings: () => this.handleTestSettings(),
      saveSettings: () => this.handleSaveSettings(),
      resetSettings: () => this.handleResetSettings()
    };
    
    Object.entries(buttons).forEach(([id, handler]) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          handler();
        });
      }
    });
  }
  
  static handleTestSettings() {
    const inputs = document.querySelectorAll('#settings-content input');
    inputs.forEach((input, i) => {
      console.log(`🏠 Input ${i}:`, {
        id: input.id, value: input.value, disabled: input.disabled,
        readOnly: input.readOnly, type: input.type
      });
      input.focus();
      setTimeout(() => input.blur(), 100);
    });
    
    const settings = SettingsManager.getSettingsFromForm();
    alert('Current form values: ' + JSON.stringify(settings, null, 2));
  }
  
  static async handleSaveSettings() {
    const saveBtn = document.getElementById('saveSettings');
    try {
      const settings = SettingsManager.getSettingsFromForm();
      const success = await SettingsManager.saveSettings(settings);
      
      if (success) {
        SettingsManager.updateConfigWithSettings(settings);
        SettingsManager.syncAdvancedFieldsWithSettings(settings);
        this.showButtonFeedback(saveBtn, 'Saved!', '#2e7d32', 'Save Settings', '#4caf50');
        
        if (appState.currentStrategy) FormDefaults.populate(appState.currentStrategy);
        Utils.logCalculation('Settings saved and applied', settings);
      } else {
        this.showButtonFeedback(saveBtn, 'Error!', '#d32f2f', 'Save Settings', '#4caf50');
      }
    } catch (error) {
      console.error('🏠 Error saving settings:', error);
      this.showButtonFeedback(saveBtn, 'Error!', '#d32f2f', 'Save Settings', '#4caf50');
    }
  }
  
  static async handleResetSettings() {
    if (!confirm('Are you sure you want to reset all settings to defaults?')) return;
    
    const resetBtn = document.getElementById('resetSettings');
    try {
      const settings = await SettingsManager.resetSettings();
      SettingsManager.populateSettingsForm(settings);
      SettingsManager.updateConfigWithSettings(settings);
      
      this.showButtonFeedback(resetBtn, 'Reset!', '#2e7d32', 'Reset to Defaults', '#f44336');
      
      if (appState.currentStrategy) FormDefaults.populate(appState.currentStrategy);
      Utils.logCalculation('Settings reset to defaults', settings);
    } catch (error) {
      console.error('🏠 Error resetting settings:', error);
    }
  }
  
  static showButtonFeedback(button, text, color, originalText, originalColor) {
    button.textContent = text;
    button.style.background = color;
    setTimeout(() => {
      button.textContent = originalText;
      button.style.background = originalColor;
    }, 2000);
  }
}

// =====================================================
// EXCEL EXPORT FUNCTIONALITY
// =====================================================

class ExcelVariableMapper {
  constructor() {
    this.variables = new Map();
    this.currentRow = 1;
  }
  
  // Add a variable and track its cell location
  addVariable(name, sheetName = 'Inputs & Parameters') {
    const cell = `'${sheetName}'!B${this.currentRow}`;
    this.variables.set(name, cell);
    this.currentRow++;
    return cell;
  }
  
  // Get formula reference for a variable (returns full cell reference)
  getRef(name) {
    return this.variables.has(name) ? this.variables.get(name) : `#REF_${name}`;
  }
  
  // Get local cell reference for current sheet calculations  
  getLocalRef(rowOffset) {
    return `B${this.currentRow + rowOffset}`;
  }
  
  // Reset for a new sheet
  resetRow(startRow = 1) {
    this.currentRow = startRow;
  }
  
  // Debug: get all variables
  getAllVariables() {
    return Object.fromEntries(this.variables);
  }
}

class ExcelExporter {
  static async export(calculation, propertyData, strategy) {
    if (typeof XLSX === 'undefined') {
      alert('Excel export library not loaded. Please try reloading the extension.');
      return;
    }
    
    try {
      console.log('🏠 Starting Excel export...');
      const wb = XLSX.utils.book_new();
      const mapper = new ExcelVariableMapper();
      
      // Get current form parameters for all strategies
      const conventionalParams = new FormParameters(CONFIG.strategies.conventional).getAll();
      const helocParams = new FormParameters(CONFIG.strategies.heloc).getAll();
      
      // Use conventional values as fallbacks for missing HELOC values
      const params = { 
        ...conventionalParams, 
        ...helocParams,
        // Ensure HELOC has a target purchase price (use conventional as fallback)
        targetPurchasePriceHeloc: helocParams.targetPurchasePriceHeloc || conventionalParams.targetPurchasePriceConventional || 0
      };
      console.log('🏠 Form parameters:', params);
      
      // Use property data from current calculation or form parameters
      const propertyDataForExport = {
        price: calculation?.askingPrice || calculation?.purchasePrice || params.targetPurchasePriceConventional || 0,
        annualTax: calculation?.annualTax || (params.propertyTaxes * 12) || 0
      };
      console.log('🏠 Property data:', propertyDataForExport);
      
      // Get the property URL asynchronously
      const propertyUrl = await this.getPropertyUrl();
      console.log('🏠 Property URL:', propertyUrl);
      
      // Calculate both strategies for comprehensive analysis
      console.log('🏠 Calculating conventional strategy...');
      const conventionalCalc = ConventionalROICalculator.calculate(
        propertyDataForExport.price || params.targetPurchasePriceConventional || 0,
        propertyDataForExport.annualTax,
        params
      );
      console.log('🏠 Conventional calc result:', conventionalCalc);
      
      console.log('🏠 Calculating HELOC strategy...');
      const helocCalc = HelocROICalculator.calculate(
        propertyDataForExport.price || params.targetPurchasePriceHeloc || 0,
        propertyDataForExport.annualTax,
        params
      );
      console.log('🏠 HELOC calc result:', helocCalc);
      
      // Create worksheets for the new 3-tab structure
      console.log('🏠 Creating Excel sheets...');
      const sheets = [
        ['Inputs & Parameters', this.createInputsSheet(params, propertyDataForExport, mapper, propertyUrl)],
        ['Conventional Strategy', this.createConventionalAnalysisSheet(conventionalCalc, mapper)],
        ['Cash + HELOC Strategy', this.createHelocAnalysisSheet(helocCalc, mapper)]
      ];
      
      console.log('🏠 Processing sheets...');
      sheets.forEach(([name, data]) => {
        console.log(`🏠 Creating sheet: ${name}`);
        const ws = XLSX.utils.aoa_to_sheet(data);
        
        // Apply number formatting to currency cells
        this.applyCellFormatting(ws, data);
        
        XLSX.utils.book_append_sheet(wb, ws, name);
      });
      
      // Debug: Log all variable mappings
      console.log('🏠 Variable mappings:', mapper.getAllVariables());
      
      // Generate filename based on property address or price
      const filename = this.generateFilename(propertyDataForExport, conventionalCalc, helocCalc, propertyUrl);
      
      console.log('🏠 Generating Excel file:', filename);
      XLSX.writeFile(wb, filename);
      console.log('🏠 Excel export completed successfully!');
    } catch (error) {
      console.error('🏠 Excel export error:', error);
      console.error('🏠 Error stack:', error.stack);
      alert('Error exporting to Excel: ' + error.message + '. Please try again.');
    }
  }

  static createInputsSheet(params, propertyData, mapper, propertyUrl = 'Property URL not available') {
    console.log('🏠 HELOC Export Parameters:', {
      helocAmount: params.helocAmount,
      helocRate: params.helocRate,
      arv: params.arv,
      refinanceRate: params.refinanceRate
    });
    
    // Reset mapper for this sheet
    mapper.resetRow(1);
    
    const data = [
      ['Real Estate ROI Analysis - Input Parameters', ''],
      ['Generated on:', new Date().toLocaleString()],
      ['Property URL:', propertyUrl],
      ['', ''],
      ['PROPERTY INFORMATION', ''],
      ['Asking Price:', propertyData?.price || 0],
      ['Target Purchase Price (Conventional):', params.targetPurchasePriceConventional || 0],
      ['Target Purchase Price (HELOC):', params.targetPurchasePriceHeloc || 0],
      ['Annual Property Taxes:', (params.propertyTaxes * 12) || 0],
      ['', ''],
      ['LOAN PARAMETERS', ''],
      ['Down Payment %:', (params.percentDown || 0) / 100],
      ['Interest Rate %:', (params.interestRate || 0) / 100],
      ['Loan Term (Years):', params.loanTerm || 30],
      ['', ''],
      ['INVESTMENT COSTS', ''],
      ['Closing Costs:', params.closingCosts || 0],
      ['Improvements/Renovation:', params.improvements || 0],
      ['Renovation Period (Months):', params.renovationPeriod || 0],
      ['', ''],
      ['MONTHLY INCOME & EXPENSES', ''],
      ['Monthly Rent:', params.rent || 0],
      ['Monthly Property Taxes:', params.propertyTaxes || 0],
      ['Monthly Insurance:', params.insurance || 0],
      ['Other Monthly Expenses:', params.otherMisc || 0],
      ['', ''],
      ['HELOC PARAMETERS', ''],
      ['HELOC Amount:', params.helocAmount || 0],
      ['HELOC Interest Rate %:', (params.helocRate || 0) / 100],
      ['HELOC Term (Years):', params.helocTerm || 10],
      ['ARV (After Repair Value):', params.arv || 0],
      ['Refinance Rate %:', (params.refinanceRate || 0) / 100],
      ['Seasoning Period (Months):', params.seasoningPeriod || 6]
    ];
    
    // Define variable mappings (track their row positions)
    mapper.currentRow = 6;  // Target Purchase Price (Conventional)
    mapper.addVariable('TargetPurchasePriceConventional');
    mapper.currentRow = 7;  // Target Purchase Price (HELOC)  
    mapper.addVariable('TargetPurchasePriceHeloc');
    mapper.currentRow = 11; // Down Payment %
    mapper.addVariable('DownPaymentPercent');
    mapper.currentRow = 12; // Interest Rate %
    mapper.addVariable('InterestRate');
    mapper.currentRow = 13; // Loan Term (Years)
    mapper.addVariable('LoanTerm');
    mapper.currentRow = 16; // Closing Costs
    mapper.addVariable('ClosingCosts');
    mapper.currentRow = 17; // Improvements/Renovation
    mapper.addVariable('Improvements');
    mapper.currentRow = 18; // Renovation Period (Months)
    mapper.addVariable('RenovationPeriod');
    mapper.currentRow = 21; // Monthly Rent
    mapper.addVariable('MonthlyRent');
    mapper.currentRow = 22; // Monthly Property Taxes
    mapper.addVariable('MonthlyPropertyTaxes');
    mapper.currentRow = 23; // Monthly Insurance
    mapper.addVariable('MonthlyInsurance');
    mapper.currentRow = 24; // Other Monthly Expenses
    mapper.addVariable('OtherMonthlyExpenses');
    mapper.currentRow = 27; // HELOC Amount
    mapper.addVariable('HelocAmount');
    mapper.currentRow = 28; // HELOC Interest Rate %
    mapper.addVariable('HelocRate');
    mapper.currentRow = 29; // HELOC Term (Years)
    mapper.addVariable('HelocTerm');
    mapper.currentRow = 30; // ARV (After Repair Value)
    mapper.addVariable('ARV');
    mapper.currentRow = 31; // Refinance Rate %
    mapper.addVariable('RefinanceRate');
    mapper.currentRow = 32; // Seasoning Period
    mapper.addVariable('SeasoningPeriod');
    
    console.log('🏠 ARV cell reference:', mapper.getRef('ARV'));
    console.log('🏠 Sample formula will be:', `${mapper.getRef('ARV')}*0.7`);

    return data;
  }
  
  static createConventionalAnalysisSheet(calculation, mapper) {
    const data = [
      ['Conventional Financing Strategy', ''],                          // Row 1
      ['', ''],                                                        // Row 2
      ['TOTAL INVESTMENT', ''],                                        // Row 3
      ['Purchase Price:', { f: mapper.getRef('TargetPurchasePriceConventional') }], // Row 4
      ['Down Payment:', { f: `B4*${mapper.getRef('DownPaymentPercent')}` }], // Row 5
      ['Closing Costs:', { f: mapper.getRef('ClosingCosts') }],       // Row 6
      ['Improvements:', { f: mapper.getRef('Improvements') }],         // Row 7
      ['Holding Costs:', { f: `PMT(${mapper.getRef('InterestRate')}/12,${mapper.getRef('LoanTerm')}*12,-(B4-B5))*${mapper.getRef('RenovationPeriod')}` }], // Row 8
      ['Total Cash Investment:', { f: 'B5+B6+B7+B8' }],               // Row 9
      ['', ''],                                                        // Row 10
      ['LOAN DETAILS', ''],                                            // Row 11
      ['Purchase Price:', { f: 'B4' }],                               // Row 12
      ['Down Payment:', { f: 'B5' }],                                 // Row 13
      ['Loan Amount:', { f: 'B4-B5' }],                               // Row 14
      ['Interest Rate (Annual):', { f: `${mapper.getRef('InterestRate')}*100` }], // Row 15
      ['Loan Term (Years):', { f: mapper.getRef('LoanTerm') }],       // Row 16
      ['Monthly Mortgage Payment:', { f: `PMT(${mapper.getRef('InterestRate')}/12,${mapper.getRef('LoanTerm')}*12,-B14)` }], // Row 17
      ['', ''],                                                        // Row 18
      ['MONTHLY CASH FLOW', ''],                                       // Row 19
      ['Monthly Rent:', { f: mapper.getRef('MonthlyRent') }],         // Row 20
      ['Monthly Mortgage (P&I):', { f: 'B17' }],                      // Row 21
      ['Monthly Property Taxes:', { f: mapper.getRef('MonthlyPropertyTaxes') }], // Row 22
      ['Monthly Insurance:', { f: mapper.getRef('MonthlyInsurance') }], // Row 23
      ['Other Monthly Expenses:', { f: mapper.getRef('OtherMonthlyExpenses') }], // Row 24
      ['Net Monthly Cash Flow:', { f: 'B20-B21-B22-B23-B24' }],       // Row 25
      ['', ''],                                                        // Row 26
      ['ROI CALCULATION', ''],                                         // Row 27
      ['Monthly Net Cash Flow:', { f: 'B25' }],                       // Row 28
      ['Annual Cash Flow:', { f: 'B28*12' }],                         // Row 29
      ['Total Cash Investment:', { f: 'B9' }],                        // Row 30
      ['ROI Percentage:', { f: 'IF(B30=0,0,(B29/B30)*100)' }],       // Row 31
      ['Payback Period (Years):', { f: 'IF(B29=0,0,B30/B29)' }],     // Row 32
      ['', ''],                                                        // Row 33
      ['12-MONTH CASH FLOW PROJECTION', ''],                          // Row 34
      ['Month', 'Rental Income', 'Mortgage', 'Taxes', 'Insurance', 'Other', 'Net Cash Flow'] // Row 35
    ];
    
    // Add 12 months of cash flow projections
    for (let month = 1; month <= 12; month++) {
      data.push([
        month,
        { f: 'B20' },  // Monthly Rent
        { f: 'B21' },  // Monthly Mortgage (P&I)
        { f: 'B22' },  // Monthly Property Taxes
        { f: 'B23' },  // Monthly Insurance
        { f: 'B24' },  // Other Monthly Expenses
        { f: 'B25' }   // Net Monthly Cash Flow
      ]);
    }
    
    return data;
  }

  static createHelocAnalysisSheet(calculation, mapper) {
    const data = [
      ['Cash + HELOC Strategy', ''],                                   // Row 1
      ['', ''],                                                        // Row 2
      ['INITIAL INVESTMENT', ''],                                      // Row 3
      ['Purchase Price:', { f: `IF(${mapper.getRef('TargetPurchasePriceHeloc')}>0,${mapper.getRef('TargetPurchasePriceHeloc')},${mapper.getRef('TargetPurchasePriceConventional')})` }], // Row 4
      ['Closing Costs:', 1000],                                       // Row 5 - Hardcoded $1,000 for HELOC strategy
      ['Improvements:', { f: mapper.getRef('Improvements') }],         // Row 6
      ['Initial Cash Required:', { f: 'B4+B5+B6' }],                  // Row 7
      ['', ''],                                                        // Row 8
      ['HELOC PAYMENTS (During Renovation)', ''],                      // Row 9
      ['HELOC Amount:', { f: mapper.getRef('HelocAmount') }],         // Row 10
      ['HELOC Rate (Annual):', { f: `${mapper.getRef('HelocRate')}*100` }], // Row 11
      ['HELOC Term (Years):', { f: mapper.getRef('HelocTerm') }],     // Row 12
      ['Monthly HELOC Payment:', { f: `IF(OR(${mapper.getRef('HelocRate')}=0,${mapper.getRef('HelocAmount')}=0),0,PMT(${mapper.getRef('HelocRate')}/12,${mapper.getRef('HelocTerm')}*12,-${mapper.getRef('HelocAmount')}))` }], // Row 13
      ['Renovation Period (Months):', { f: mapper.getRef('RenovationPeriod') }], // Row 14
      ['Total HELOC Holding Costs:', { f: 'B13*B14' }],               // Row 15
      ['Total Cash In:', { f: 'B7+B15' }],                            // Row 16
      ['', ''],                                                        // Row 17
      ['REFINANCE RECOVERY', ''],                                      // Row 18
      ['ARV (After Repair Value):', { f: mapper.getRef('ARV') }],     // Row 19
      ['70% LTV Limit:', { f: `${mapper.getRef('ARV')}*0.7` }],       // Row 20
      ['Renovation Period (Months):', { f: 'B14' }],                  // Row 21
      ['Time Constraint Active:', { f: `IF(B21<6,"YES","NO")` }],     // Row 22
      ['Time Constraint Limit:', { f: `IF(B22="YES",B4,B19)` }],      // Row 23
      ['Refinance Amount:', { f: 'MIN(B20,B23)' }],                   // Row 24
      ['Refinance Closing Costs:', 3000],                             // Row 25
      ['Net Cash Out from Refinance:', { f: 'IF(B24>B25,B24-B25,0)' }], // Row 26
      ['', ''],                                                        // Row 27
      ['FINAL INVESTMENT', ''],                                        // Row 28
      ['Total Cash In:', { f: 'B16' }],                               // Row 29
      ['Less: Cash Out from Refinance:', { f: 'B26' }],               // Row 30
      ['Final Cash Investment:', { f: 'B29-B30' }],                   // Row 31
      ['', ''],                                                        // Row 32
      ['NEW MORTGAGE DETAILS', ''],                                    // Row 33
      ['Refinance Amount:', { f: 'B24' }],                            // Row 34
      ['Refinance Rate (Annual):', { f: `${mapper.getRef('RefinanceRate')}*100` }], // Row 35
      ['Loan Term (Years):', 30],                                     // Row 36
      ['New Monthly Mortgage Payment:', { f: `IF(OR(${mapper.getRef('RefinanceRate')}=0,B34=0),0,PMT(${mapper.getRef('RefinanceRate')}/12,B36*12,-B34))` }], // Row 37
      ['', ''],                                                        // Row 38
      ['MONTHLY CASH FLOW', ''],                                       // Row 39
      ['Monthly Rent:', { f: mapper.getRef('MonthlyRent') }],         // Row 40
      ['Monthly Mortgage (P&I):', { f: 'B37' }],                      // Row 41
      ['Monthly Property Taxes:', { f: mapper.getRef('MonthlyPropertyTaxes') }], // Row 42
      ['Monthly Insurance:', { f: mapper.getRef('MonthlyInsurance') }], // Row 43
      ['Other Monthly Expenses:', { f: mapper.getRef('OtherMonthlyExpenses') }], // Row 44
      ['Net Monthly Cash Flow:', { f: 'B40-B41-B42-B43-B44' }],       // Row 45
      ['', ''],                                                        // Row 46
      ['ROI CALCULATION', ''],                                         // Row 47
      ['Monthly Net Cash Flow:', { f: 'B45' }],                       // Row 48
      ['Annual Cash Flow:', { f: 'B48*12' }],                         // Row 49
      ['Final Cash Investment:', { f: 'B31' }],                       // Row 50
      ['ROI Percentage:', { f: 'IF(B50=0,0,(B49/B50)*100)' }],       // Row 51
      ['Payback Period (Years):', { f: 'IF(B49=0,0,B50/B49)' }],     // Row 52
      ['', ''],                                                        // Row 53
      ['12-MONTH CASH FLOW PROJECTION', ''],                          // Row 54
      ['Month', 'Rental Income', 'Mortgage', 'Taxes', 'Insurance', 'Other', 'Net Cash Flow'] // Row 55
    ];
    
    // Add 12 months of cash flow projections
    for (let month = 1; month <= 12; month++) {
      data.push([
        month,
        { f: 'B40' },  // Monthly Rent
        { f: 'B41' },  // Monthly Mortgage (P&I)
        { f: 'B42' },  // Monthly Property Taxes
        { f: 'B43' },  // Monthly Insurance
        { f: 'B44' },  // Other Monthly Expenses
        { f: 'B45' }   // Net Monthly Cash Flow
      ]);
    }
    
    return data;
  }
  
  static applyCellFormatting(ws, data) {
    if (!ws['!ref']) return;
    
    const range = XLSX.utils.decode_range(ws['!ref']);
    
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = ws[cellAddress];
        
        if (cell && data[row] && data[row][col]) {
          const cellLabel = typeof data[row][col-1] === 'string' ? data[row][col-1] : '';
          const cellValue = data[row][col];
          
          // Check if it's a percentage cell (rate fields or percentage labels)
          if ((typeof cellValue === 'string' && cellValue.includes('%')) ||
              cellLabel.includes('Rate %') || 
              cellLabel.includes('Down Payment %')) {
            cell.z = '0.00%';
          }
          // Monthly Interest Rate should be percentage format (formula already multiplied by 100)
          else if (cellLabel.includes('Monthly Interest Rate') || 
                   cellLabel.includes('Monthly Rate') || 
                   cellLabel.includes('Refinance Monthly Rate') ||
                   cellLabel.includes('HELOC Monthly Rate')) {
            cell.z = '0.00"%"';
          }
          // ROI and Discount cells already have *100 in formula, so use number format with % symbol
          else if (cellLabel.includes('ROI') || cellLabel.includes('Discount Percentage')) {
            cell.z = '0.00"%"';
          }
          // Number of Payments should be whole number format
          else if (cellLabel.includes('Number of Payments') ||
                   cellLabel.includes('HELOC Payments') ||
                   cellLabel.includes('Refinance Payments')) {
            cell.z = '0';
          }
          // Check if it's a currency cell (price, cost, payment, cash flow fields)
          else if (cellLabel.includes('Price') || 
                   cellLabel.includes('Cost') || 
                   cellLabel.includes('Payment') ||
                   cellLabel.includes('Cash') ||
                   cellLabel.includes('Rent') ||
                   cellLabel.includes('Amount') ||
                   cellLabel.includes('Investment') ||
                   cellLabel.includes('Income') ||
                   cellLabel.includes('Expense') ||
                   cellLabel.includes('Insurance') ||
                   cellLabel.includes('Taxes') ||
                   cellLabel.includes('Improvement') ||
                   (cell.f && (cell.f.includes('PMT') || cell.f.includes('SUM') || 
                              cell.f.includes('Cash') || cell.f.includes('Payment') ||
                              cell.f.includes('Price') || cell.f.includes('Amount')))) {
            cell.z = '"$"#,##0.00';
          }
          // Number formatting for years, months, periods (no currency or percentage)
          else if (cellLabel.includes('Years') || 
                   cellLabel.includes('Months') ||
                   cellLabel.includes('Period') ||
                   cellLabel.includes('Term')) {
            cell.z = '0.00';
          }
        }
      }
    }
  }
  
  static createSummarySheet(calculation, propertyData, strategyName) {
    const cashOut = calculation.cashOut !== undefined ? [
      ['Cash Out (Refinance):', this.formatCurrency(calculation.cashOut)],
      ['Final Cash In:', this.formatCurrency(calculation.finalCashIn)]
    ] : [];
    
    const baseData = [
      ['Real Estate ROI Analysis - Summary', ''], 
      ['Generated on:', new Date().toLocaleString()], 
      ['Strategy:', strategyName], 
      ['', ''],
      ['PROPERTY INFORMATION', ''],
      ['Asking Price:', this.formatCurrency(calculation.askingPrice || propertyData?.price || 'N/A')],
      ['Purchase Price:', this.formatCurrency(calculation.purchasePrice)],
      ['Discount:', calculation.discountPercent ? `${calculation.discountPercent.toFixed(1)}%` : 'N/A'], 
      ['', ''],
      ['KEY RESULTS', ''],
      ['Annual ROI:', `${calculation.roi.toFixed(2)}%`],
      ['Monthly Cash Flow:', this.formatCurrency(calculation.monthlyCashFlowWithHeloc || calculation.monthlyCashFlow)],
      ['Annual Cash Flow:', this.formatCurrency(calculation.annualCashFlow)],
      ['Payback Period:', `${calculation.paybackPeriod.toFixed(1)} years`], 
      ['', ''],
      ['INVESTMENT SUMMARY', ''], 
      ['Total Cash In:', this.formatCurrency(calculation.totalCashIn)]
    ];
    
    if (cashOut.length > 0) {
      baseData.push(...cashOut);
    }
    
    baseData.push(
      ['', ''],
      ['MONTHLY BREAKDOWN', ''],
      ['Rental Income:', this.formatCurrency(calculation.details.rent)],
      ['Mortgage Payment:', this.formatCurrency(Math.round(calculation.mortgagePayment))],
      ['Property Taxes:', this.formatCurrency(calculation.details.taxes)],
      ['Insurance:', this.formatCurrency(calculation.details.insurance)],
      ['Other Expenses:', this.formatCurrency(calculation.details.other)],
      ['Net Cash Flow:', this.formatCurrency(calculation.monthlyCashFlowWithHeloc || calculation.monthlyCashFlow)]
    );
    
    return baseData;
  }
  
  static formatCurrency(amount) {
    if (typeof amount === 'string') return amount;
    return `$${amount.toLocaleString()}`;
  }
  
  static generateFilename(propertyData, conventionalCalc, helocCalc, propertyUrl = null) {
    try {
      let addressPart = '';
      
      // First priority: Extract address from the captured property URL
      if (propertyUrl && propertyUrl !== 'Property URL not available') {
        addressPart = this.extractAddressFromText(propertyUrl);
        console.log('🏠 Address from property URL:', addressPart);
      }
      
      // Second priority: Extract address from document title
      if (!addressPart && document.title) {
        addressPart = this.extractAddressFromText(document.title);
        console.log('🏠 Address from document title:', addressPart);
      }
      
      // Third priority: Try current window location (though this will be extension URL)
      if (!addressPart && window.location) {
        addressPart = this.extractAddressFromText(window.location.href);
        console.log('🏠 Address from window location:', addressPart);
      }
      
      // If still no address, try to get it from property data or use price as fallback
      if (!addressPart) {
        const price = Math.round((conventionalCalc.purchasePrice || helocCalc.purchasePrice) / 1000);
        addressPart = `${price}k_Property`;
      }
      
      // Add date
      const date = new Date().toISOString().split('T')[0];
      
      // Sanitize filename
      const sanitizedAddress = this.sanitizeFilename(addressPart);
      
      return `ROI_Analysis_${sanitizedAddress}_${date}.xlsx`;
    } catch (error) {
      console.warn('🏠 Error generating custom filename, using fallback:', error);
      // Fallback to original format
      const price = Math.round((conventionalCalc.purchasePrice || helocCalc.purchasePrice) / 1000);
      const date = new Date().toISOString().split('T')[0];
      return `ROI_Analysis_${price}k_${date}.xlsx`;
    }
  }
  
  static getCurrentPageUrl() {
    try {
      // Get URL from the active tab using chrome.tabs API
      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
          chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0] && tabs[0].url) {
              resolve(tabs[0].url);
            } else {
              resolve('Property URL not available');
            }
          });
        } else {
          resolve('Property URL not available');
        }
      });
    } catch (error) {
      console.warn('🏠 Error getting current page URL:', error);
      return Promise.resolve('Property URL not available');
    }
  }

  static async getPropertyUrl() {
    try {
      return await this.getCurrentPageUrl();
    } catch (error) {
      console.warn('🏠 Error getting property URL:', error);
      return 'Property URL not available';
    }
  }

  static extractAddressFromText(text) {
    if (!text) return null;
    
    // Try URL-specific address extraction first
    if (text.includes('http') || text.includes('www') || text.includes('.com')) {
      const urlAddress = this.extractAddressFromUrl(text);
      if (urlAddress) return urlAddress;
    }
    
    // Remove common website prefixes and suffixes
    let cleaned = text.replace(/(https?:\/\/)|(www\.)|(\.(com|org|net)).*$/gi, '');
    
    // Look for address patterns (numbers followed by words, street types)
    const addressPatterns = [
      // "123 Main St" or "456 Oak Avenue"  
      /(\d+\s+[A-Za-z\s]+(St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Ct|Court|Pl|Place|Way|Blvd|Boulevard))/i,
      // "Main Street 123" (reverse format)
      /([A-Za-z\s]+(St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Ct|Court|Pl|Place|Way|Blvd|Boulevard)\s+\d+)/i,
      // Just house number and first word (like "123 Main")
      /(\d{1,5}\s+[A-Za-z]+)/,
    ];
    
    for (let pattern of addressPatterns) {
      const match = cleaned.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    // If no pattern found, try to extract meaningful parts from URL or title
    // Remove common real estate site names
    cleaned = cleaned.replace(/(redfin|zillow|realtor|mls)/gi, '');
    
    // Get the first few meaningful words (skip single letters and numbers)
    const words = cleaned.split(/[\s\-_\/]+/)
      .filter(word => word.length > 1 && !/^\d+$/.test(word))
      .slice(0, 3)
      .join('_');
    
    return words.length > 0 ? words : null;
  }
  
  static extractAddressFromUrl(url) {
    if (!url) return null;
    
    try {
      // Decode URL first
      const decodedUrl = decodeURIComponent(url).toLowerCase();
      
      // Redfin URL patterns: /CA/Los-Angeles/123-Main-St-Los-Angeles-CA-90210/
      const redfinPattern = /\/[a-z]{2}\/[^\/]+\/(\d+[^\/]*)/i;
      const redfinMatch = decodedUrl.match(redfinPattern);
      if (redfinMatch && redfinMatch[1]) {
        const addressPart = redfinMatch[1]
          .replace(/[-_]/g, ' ')
          .replace(/\s*\b[a-z]{2}\s*\d{5}.*$/i, '') // Remove state and zip
          .replace(/\s+/g, ' ')
          .trim();
        if (addressPart.length > 3) return addressPart;
      }
      
      // Zillow URL patterns: /homedetails/123-Main-St-Los-Angeles-CA-90210/
      const zillowPattern = /homedetails\/([^\/]+)/i;
      const zillowMatch = decodedUrl.match(zillowPattern);
      if (zillowMatch && zillowMatch[1]) {
        const addressPart = zillowMatch[1]
          .replace(/[-_]/g, ' ')
          .replace(/\s*\b[a-z]{2}\s*\d{5}.*$/i, '') // Remove state and zip
          .replace(/\s+/g, ' ')
          .trim();
        if (addressPart.length > 3) return addressPart;
      }
      
      // Realtor.com patterns: /property/123-Main-St_Los-Angeles_CA_90210
      const realtorPattern = /property\/([^\/]+)/i;
      const realtorMatch = decodedUrl.match(realtorPattern);
      if (realtorMatch && realtorMatch[1]) {
        const addressPart = realtorMatch[1]
          .replace(/[-_]/g, ' ')
          .replace(/\s*\b[a-z]{2}\s*\d{5}.*$/i, '') // Remove state and zip
          .replace(/\s+/g, ' ')
          .trim();
        if (addressPart.length > 3) return addressPart;
      }
      
      // Generic pattern: look for address-like segments in URL path
      const urlParts = decodedUrl.split('/');
      for (const part of urlParts) {
        if (part && part.length > 5 && /\d/.test(part) && /[a-z]/.test(part)) {
          const cleaned = part
            .replace(/[-_]/g, ' ')
            .replace(/\s*\b[a-z]{2}\s*\d{5}.*$/i, '') // Remove state and zip
            .replace(/\s+/g, ' ')
            .trim();
          if (cleaned.length > 3 && /^\d/.test(cleaned)) {
            return cleaned;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.warn('🏠 Error extracting address from URL:', error);
      return null;
    }
  }
  
  static sanitizeFilename(filename) {
    if (!filename) return 'Property';
    
    return filename
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
      .replace(/\s+/g, '_')         // Replace spaces with underscores
      .replace(/_{2,}/g, '_')       // Replace multiple underscores with single
      .replace(/^_|_$/g, '')        // Remove leading/trailing underscores
      .substring(0, 50);            // Limit length
  }
}

// =====================================================
// APPLICATION INITIALIZATION
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
  console.log('🏠 DOM Content Loaded');
  Utils.logCalculation('Application initializing', {});
  
  // Check if key elements exist
  const elements = {
    'input-form': document.getElementById('input-form'),
    'settings-content': document.getElementById('settings-content'),
    'calculate-btn': document.getElementById('calculate-btn'),
    'saveSettings': document.getElementById('saveSettings'),
    'resetSettings': document.getElementById('resetSettings')
  };
  
  console.log('🏠 Element check:', elements);
  
  // Check tabs
  const tabs = document.querySelectorAll('.tab');
  console.log('🏠 Tabs found:', tabs.length);
  tabs.forEach((tab, i) => {
    console.log(`🏠 Tab ${i}:`, tab.dataset.strategy, tab.textContent.trim());
  });
  
  EventHandlers.initializeAll();
});
