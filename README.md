# Real Estate ROI Calculator Chrome Extension 🏠

A sophisticated Chrome browser extension that automatically calculates Return on Investment (ROI) for real estate properties using two distinct investment strategies: **Conventional Financing** and **Cash + HELOC Refinance**. Designed for Redfin and Zillow listing pages.

## 🚀 Key Features

### **Dual Investment Strategy Analysis**
- **Conventional Financing**: Traditional mortgage-based investment analysis
- **Cash + HELOC Refinance**: Advanced BRRRR (Buy, Rehab, Rent, Refinance, Repeat) strategy with HELOC financing

### **Intelligent Target Price Optimization**
- **Binary Search Algorithm**: Automatically calculates optimal purchase price for 10% ROI target
- **Strategy-Specific Pricing**: Separate target prices for each investment strategy
- **Manual Override**: Users can enter custom purchase prices to override auto-calculations

### **Automatic Data Extraction**
- **Multi-Platform Support**: Works on both Redfin and Zillow property listings
- **Smart Property Detection**: Automatically extracts asking price and annual property taxes
- **Fallback Tax Estimation**: Uses 1.5% estimation when tax data unavailable

### **Advanced ARV Calculations**
- **HELOC Strategy Only**: ARV = Purchase Price + (2 × Improvement Costs)
- **Auto-Update Logic**: ARV recalculates when target purchase price changes
- **Manual Entry Preservation**: Respects user-entered ARV values

## 📊 Investment Strategy Details

### **Strategy 1: Conventional Financing**
Traditional real estate investment approach using mortgage financing.

**Calculation Flow:**
1. **Purchase with Financing**: Down payment + mortgage
2. **Renovation Period**: Hold property during improvements
3. **Rental Income**: Generate monthly cash flow
4. **ROI Analysis**: Annual cash flow ÷ total cash invested

### **Strategy 2: Cash + HELOC Refinance (BRRRR)**
Advanced strategy using all-cash purchase followed by refinance.

**Calculation Flow:**
1. **Cash Purchase**: Buy property with 100% cash
2. **HELOC Financing**: Fund improvements with Home Equity Line of Credit
3. **Renovation Period**: Complete improvements (2-6 months)
4. **Seasoning Period**: Wait for lender requirements (typically 2-6 months)
5. **Cash-Out Refinance**: Extract capital based on new ARV
6. **Final Analysis**: Calculate ROI on remaining invested capital

## 🧮 Mathematical Formulas

### **Conventional Financing Calculations**

```
Down Payment = Purchase Price × (Down Payment % ÷ 100)
Loan Amount = Purchase Price - Down Payment

Monthly Mortgage Payment = [Loan Amount × (Monthly Rate × (1 + Monthly Rate)^N)] ÷ [(1 + Monthly Rate)^N - 1]
Where: Monthly Rate = (Annual Rate ÷ 100) ÷ 12, N = Loan Term × 12

Holding Costs = Monthly Mortgage Payment × Renovation Period (months)
Total Cash In = Down Payment + Closing Costs + Improvement Costs + Holding Costs

Monthly Cash Flow = Rent - Mortgage Payment - Monthly Taxes - Insurance - Other Expenses
Annual Cash Flow = Monthly Cash Flow × 12
ROI = (Annual Cash Flow ÷ Total Cash In) × 100
```

### **HELOC Strategy Calculations**

```
ARV = Purchase Price + (2 × Improvement Costs)

Initial Cash In = Purchase Price + Closing Costs + Improvement Costs
HELOC Monthly Payment = [HELOC Amount × (Monthly Rate × (1 + Monthly Rate)^N)] ÷ [(1 + Monthly Rate)^N - 1]
Total Holding Period = Renovation Period + Seasoning Period
Holding Costs = HELOC Monthly Payment × Total Holding Period
Total Cash In = Initial Cash In + Holding Costs

Refinance Logic:
- If Seasoning < 6 months: Refinance Loan = MIN(Purchase Price, 70% of ARV)
- If Seasoning ≥ 6 months: Refinance Loan = 70% of ARV

Cash Out = Refinance Loan Amount - Refinance Closing Costs
Final Cash In = Total Cash In - Cash Out

Monthly Cash Flow = Rent - Refinance Payment - Monthly Taxes - Insurance - Other - HELOC Payment
Annual Cash Flow = Monthly Cash Flow × 12
ROI = (Annual Cash Flow ÷ Final Cash In) × 100
```

### **Target Purchase Price Optimization**

The extension uses a **binary search algorithm** to find the optimal purchase price that yields exactly 10% ROI:

```
Conventional Strategy: Search Range = 50% to 120% of asking price
HELOC Strategy: Search Range = 30% to 100% of asking price

For each iteration:
1. Test price = (Low + High) ÷ 2
2. Calculate ROI using test price
3. If ROI < 10%: Adjust high boundary (need lower price)
4. If ROI > 10%: Adjust low boundary (can afford higher price)
5. Converge when |ROI - 10%| < 0.001%
```

## ⚙️ Default Parameters & Assumptions

### **Shared Parameters**
- **Target ROI**: 10% (hardcoded)
- **Monthly Rent**: $1,800 (conventional), $1,700 (HELOC)
- **Improvement Costs**: $10,000
- **Renovation Period**: 4 months

### **Conventional Financing Defaults**
- **Interest Rate**: 7.5%
- **Down Payment**: 20%
- **Loan Term**: 30 years
- **Closing Costs**: $5,000
- **Insurance**: $120/month
- **Other Expenses**: $200/month

### **HELOC Strategy Defaults**
- **HELOC Rate**: 9.25%
- **HELOC Amount**: Matches improvement costs
- **HELOC Term**: 10 years
- **Seasoning Period**: Matches renovation period
- **Refinance Rate**: 7.63%
- **Closing Costs**: $1,000 (purchase), $5,000 (refinance)
- **Insurance**: $75/month
- **Other Expenses**: $200/month

### **Key Assumptions**
1. **Property Taxes**: Extracted from listing or estimated at 1.5% of purchase price
2. **ARV Formula**: Purchase price + (2 × improvement costs) for HELOC strategy only
3. **Refinance Limitations**: Seasoning period affects maximum refinance amount
4. **Cash Flow**: All calculations assume immediate rental at specified rate
5. **No Vacancy**: Calculations assume 100% occupancy
6. **No Appreciation**: Property value growth not factored into ROI
7. **Fixed Rates**: Interest rates remain constant throughout analysis

## 🛠️ Installation

1. **Clone Repository**:
   ```bash
   git clone https://github.com/slice4e/real-estate-roi-extension.git
   ```

2. **Load Extension**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked" and select the extension folder

3. **Usage**:
   - Navigate to any Redfin or Zillow property listing
   - Click the extension icon in your browser toolbar
   - Switch between "Conventional" and "Cash + HELOC" strategy tabs
   - Adjust parameters as needed
   - View real-time ROI calculations

## 🏗️ Technical Architecture

### **File Structure**
```
real-estate-roi-extension/
├── manifest.json          # Extension configuration (Manifest V3)
├── content.js             # DOM data extraction logic
├── popup.html             # Extension popup UI with dual strategy tabs
├── popup.js               # ROI calculation engine with binary search
├── icon.png               # Extension icon (128x128)
└── README.md              # This documentation
```

### **Core Components**

1. **Data Extraction (`content.js`)**:
   - Multiple extraction patterns for property price and taxes
   - Mortgage calculator detection
   - Tax history table parsing
   - Error handling and fallback mechanisms

2. **Calculation Engine (`popup.js`)**:
   - Dual strategy ROI calculations
   - Binary search optimization algorithms
   - Strategy-specific parameter management
   - ARV auto-calculation for HELOC strategy

3. **User Interface (`popup.html`)**:
   - Tabbed interface for strategy selection
   - Real-time parameter adjustment
   - Strategy-specific field visibility
   - Auto-calculation indicators

### **Data Extraction Methods**
1. **Price Detection**: Multiple selectors for listing prices across platforms
2. **Tax Extraction**: 
   - Mortgage calculator patterns (most reliable)
   - Property tax history tables
   - Tax assessment records
3. **Error Handling**: Graceful fallbacks and user notifications

## 🐛 Development & Debugging

The extension includes comprehensive debugging with 🏠 emoji markers:

```javascript
// Enable debug mode in browser console
// Look for messages starting with "🏠"
console.log('🏠 Binary search iteration:', iteration, 'ROI:', roi.toFixed(2) + '%');
```

**Debug Categories**:
- **🏠 Data Extraction**: Property price and tax detection
- **🏠 Binary Search**: Target price optimization iterations
- **🏠 ARV Calculation**: After Repair Value computations
- **🏠 Strategy Switching**: Tab changes and field management

## 📈 Use Cases & Applications

### **Investment Analysis**
- **Fix & Flip**: Quick ROI assessment for renovation projects
- **Buy & Hold**: Long-term rental property evaluation
- **BRRRR Strategy**: Advanced cash-out refinance analysis
- **Market Comparison**: Compare properties across different strategies

### **Deal Evaluation**
- **Purchase Price Targets**: Know exactly what to offer for 10% ROI
- **Strategy Selection**: Compare conventional vs. HELOC approaches
- **Cash Requirements**: Understand total capital needs
- **Risk Assessment**: Evaluate cash flow scenarios

## ⚠️ Limitations & Disclaimers

### **Calculation Limitations**
- **No Vacancy Factor**: Assumes 100% occupancy
- **Static Market**: No appreciation or market changes
- **Fixed Costs**: Insurance, taxes, and expenses remain constant
- **Perfect Execution**: No renovation overruns or delays
- **Immediate Rental**: No vacancy between purchase and tenant placement

### **Data Accuracy**
- **Website Dependencies**: Extraction relies on current site layouts
- **Tax Estimates**: May not reflect actual current tax assessments
- **Market Rates**: Interest rates may not reflect current market conditions

### **Investment Advice**
This tool is for **educational and analysis purposes only**. Always:
- Verify all property data independently
- Consult with real estate professionals
- Perform additional due diligence
- Consider local market conditions
- Factor in personal financial situation

## 🚀 Future Enhancements

### **Planned Features**
- [ ] **Multiple Strategy Comparison**: Side-by-side analysis
- [ ] **Historical Data Integration**: Track property price trends
- [ ] **Vacancy Factor**: Configurable occupancy rates
- [ ] **Market Appreciation**: Include property value growth
- [ ] **Sensitivity Analysis**: ROI ranges based on parameter variations
- [ ] **Export Functionality**: Save calculations to spreadsheet
- [ ] **Portfolio Analysis**: Multiple property management

### **Platform Expansion**
- [ ] **Additional Websites**: LoopNet, Apartments.com, etc.
- [ ] **Mobile Support**: Chrome mobile extension
- [ ] **API Integration**: Real-time market data feeds

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Test** on both Redfin and Zillow listings
5. **Push** to the branch (`git push origin feature/amazing-feature`)
6. **Open** a Pull Request

### **Development Guidelines**
- Maintain comprehensive console debugging
- Test both investment strategies thoroughly
- Preserve user-entered data during tab switches
- Follow existing code patterns and naming conventions

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

---

**Built for Real Estate Investors** 🏠 | **Version 2.0** | **Last Updated: August 2025**
