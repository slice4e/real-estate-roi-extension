function calculateROI(price, tax, rehabCost = 30000, rent = 1800) {
  console.log('Calculating ROI with:', { price, tax, rehabCost, rent });
  
  if (!price && !tax) return "No price or tax data found";
  if (!price) return "Price not found";
  if (!tax) return "Tax data not found";

  const annualIncome = rent * 12;
  const annualExpenses = tax + 1000; // $1000 for other expenses
  const netIncome = annualIncome - annualExpenses;
  const totalInvestment = price + rehabCost;
  const roi = (netIncome / totalInvestment) * 100;
  
  return `${roi.toFixed(1)}% (Price: $${price.toLocaleString()}, Tax: $${tax.toLocaleString()})`;
}

document.addEventListener("DOMContentLoaded", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    const output = document.getElementById("output");
    
    // Check if we're on a supported site
    if (!currentTab.url.includes('redfin.com') && !currentTab.url.includes('zillow.com')) {
      output.textContent = "Please navigate to a Redfin or Zillow property page.";
      return;
    }
    
    // First try to send message to existing content script
    chrome.tabs.sendMessage(currentTab.id, { type: "getListingData" }, (data) => {
      if (chrome.runtime.lastError) {
        console.log('Content script not found, injecting script...', chrome.runtime.lastError);
        
        // If content script isn't available, inject it manually
        chrome.scripting.executeScript({
          target: { tabId: currentTab.id },
          files: ['content.js']
        }, () => {
          if (chrome.runtime.lastError) {
            output.textContent = "Error: Could not inject script. Please reload the page and try again.";
            console.error('Script injection error:', chrome.runtime.lastError);
            return;
          }
          
          // Wait a moment for script to initialize, then try again
          setTimeout(() => {
            chrome.tabs.sendMessage(currentTab.id, { type: "getListingData" }, (data) => {
              if (chrome.runtime.lastError) {
                output.textContent = "Error: Could not communicate with page. Please reload and try again.";
                console.error('Second attempt failed:', chrome.runtime.lastError);
              } else {
                console.log('Received data from injected script:', data);
                const roi = calculateROI(data?.price, data?.annualTax);
                output.textContent = `ROI: ${roi}`;
              }
            });
          }, 500);
        });
      } else {
        console.log('Received data from content script:', data);
        const roi = calculateROI(data?.price, data?.annualTax);
        output.textContent = `ROI: ${roi}`;
      }
    });
  });
});
