// Web Worker for calculating Pi digits off the main thread
// This prevents the UI from freezing during computation

self.onmessage = function(e) {
  const { numDigits } = e.data;
  
  try {
    const digits = calculatePiDigits(numDigits);
    self.postMessage({ success: true, digits });
  } catch (error) {
    self.postMessage({ success: false, error: error.message });
  }
};

function calculatePiDigits(numDigits) {
  const digits = [];
  let q = 1n;
  let r = 180n;
  let t = 60n;
  let i = 2n;
  
  for (let j = 0; j < numDigits; j++) {
    let u = 3n * (3n * i + 1n) * (3n * i + 2n);
    let y = (q * (27n * i - 12n) + 5n * r) / (5n * t);
    digits.push(Number(y));
    
    let qNew = 10n * q * i * (2n * i - 1n);
    let rNew = 10n * u * (q * (5n * i - 2n) + r - y * t);
    let tNew = t * u;
    
    i += 1n;
    q = qNew;
    r = rNew;
    t = tNew;
    
    // Send progress updates and partial digits every 1000 digits
    if (j % 1000 === 0 && j > 0) {
      // Send the digits calculated so far so the main thread can render progressively
      self.postMessage({ 
        success: false,
        progress: j,
        total: numDigits,
        digitsSoFar: digits.join('')
      });
    }
  }
  
  return digits.join('');
}
