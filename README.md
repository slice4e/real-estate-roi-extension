# Real Estate ROI Calculator Chrome Extension 🏠

A Chrome browser extension that automatically calculates Return on Investment (ROI) for real estate properties on Redfin and Zillow listing pages.

## Features

- **Multi-Platform Support**: Works on both Redfin and Zillow property listings
- **Automatic Data Extraction**: Pulls property price and annual tax information from listing pages
- **Smart Tax Detection**: Uses multiple methods including mortgage calculator data and tax history tables
- **Instant ROI Calculation**: Calculates investment returns with configurable parameters
- **Clean UI**: Simple popup interface with clear results

## How It Works

1. Navigate to any property listing on Redfin or Zillow
2. Click the extension icon in your browser toolbar
3. View instant ROI calculations based on:
   - Property purchase price (extracted automatically)
   - Annual property taxes (extracted automatically)
   - Rehab costs: $30,000 (configurable)
   - Monthly rental income: $1,800 (configurable)

## Installation

1. Clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked" and select the extension folder
5. The extension icon will appear in your browser toolbar

## Technical Details

### Architecture
- **Manifest V3** Chrome extension
- **Content Scripts** for DOM data extraction
- **Popup Interface** for ROI display and calculation

### Data Extraction Methods
1. **Mortgage Calculator Pattern**: Detects "Property taxes $XXX" in mortgage calculators (most reliable)
2. **Tax History Tables**: Parses property tax data from historical records
3. **Zillow-Specific Selectors**: Targeted extraction for Zillow's unique page structure

### Files Structure
```
real-estate-roi-extension/
├── manifest.json          # Extension configuration
├── content.js             # Data extraction logic
├── popup.html             # Extension popup UI
├── popup.js               # ROI calculation logic
├── icon.png               # Extension icon (128x128)
└── README.md              # This file
```

## Configuration

You can modify the default investment parameters in `popup.js`:
- **Rehab Cost**: Currently set to $30,000
- **Monthly Rent**: Currently set to $1,800
- **Other Parameters**: Down payment percentage, interest rates, etc.

## Development

The extension includes extensive debugging with 🏠 emoji markers in the console. To see debug output:
1. Open Chrome DevTools (F12)
2. Go to the Console tab
3. Navigate to a property listing
4. Click the extension icon
5. View the extraction process in real-time

## Compatibility

- **Websites**: Redfin.com, Zillow.com
- **Browser**: Chrome (Manifest V3)
- **Data Sources**: Mortgage calculators, tax history tables, property fact sheets

## Future Improvements

- [ ] Add support for additional real estate websites
- [ ] Configurable investment parameters through UI
- [ ] Historical ROI tracking
- [ ] Export calculations to spreadsheet
- [ ] Multiple property comparison
- [ ] Cash flow analysis
- [ ] Appreciation scenarios

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on both Redfin and Zillow listings
5. Submit a pull request

## License

MIT License - Feel free to use and modify for your real estate investment needs!

---

**Note**: This extension is for educational and analysis purposes. Always verify property data and consult with real estate professionals before making investment decisions.
