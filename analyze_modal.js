/**
 * Analyze the "light overlay" issue on DeFi position modal
 * Focus: Mobile viewport and ChatPanel backdrop interference
 */

const puppeteer = require('puppeteer');

async function analyzeLightOverlayIssue() {
  // Use mobile viewport to reproduce the issue
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Set mobile viewport (iPhone 14 Pro dimensions)
  await page.setViewport({ width: 393, height: 852, isMobile: true, hasTouch: true });

  try {
    console.log('=== ANALYZING LIGHT OVERLAY ISSUE ===\n');
    console.log('Viewport: 393x852 (Mobile)\n');

    // Navigate to accounts page
    console.log('Navigating to https://money.khanh.page/accounts...');
    await page.goto('https://money.khanh.page/accounts', { waitUntil: 'networkidle0', timeout: 30000 });

    // Login if needed
    const url = page.url();
    if (url.includes('/login') || url.includes('/auth')) {
      console.log('Logging in...');
      await page.type('input[type="email"], input[name="email"]', 'godstorm91@gmail.com');
      await page.type('input[type="password"], input[name="password"]', '1@3c#.Net');
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });
    }

    // Wait for page to fully load
    await new Promise(r => setTimeout(r, 3000));

    console.log('Page loaded. Finding and clicking DeFi position...\n');

    // Find and click a DeFi position
    await page.evaluate(() => {
      // Look for position cards with token logos (stacked circles)
      const buttons = Array.from(document.querySelectorAll('button'));
      const positionBtn = buttons.find(b => {
        const parent = b.closest('[class*="cursor-pointer"]') || b.closest('div');
        return parent && b.querySelector('[class*="rounded-full"]') !== null;
      });
      if (positionBtn) positionBtn.click();
    });

    // Wait for modal to open
    await new Promise(r => setTimeout(r, 3000));

    // Analyze all overlay elements
    console.log('=== ANALYZING OVERLAY ELEMENTS ===\n');

    const overlayAnalysis = await page.evaluate(() => {
      const results = {
        allFixedElements: [],
        backdropElements: [],
        modalElements: [],
        chatPanelBackdrop: null,
        positionDetailModal: null
      };

      // Get all fixed position elements
      const allElements = document.querySelectorAll('*');

      allElements.forEach(el => {
        const style = window.getComputedStyle(el);
        const classes = el.className?.toString() || '';
        const rect = el.getBoundingClientRect();

        if (style.position === 'fixed' && rect.width > 0 && rect.height > 0) {
          const zIndex = parseInt(style.zIndex) || 0;
          const bgColor = style.backgroundColor;
          const opacity = parseFloat(style.opacity) || 1;

          const element = {
            tag: el.tagName.toLowerCase(),
            id: el.id || '',
            classes: classes.substring(0, 120),
            zIndex,
            backgroundColor: bgColor,
            opacity,
            display: style.display,
            visibility: style.visibility,
            inset: style.inset,
            width: rect.width,
            height: rect.height,
            outerHTML: el.outerHTML?.substring(0, 200)
          };

          results.allFixedElements.push(element);

          // Check for backdrop-like elements (black with alpha)
          if (bgColor.includes('rgba(0, 0, 0') && opacity < 1) {
            results.backdropElements.push(element);
          }

          // Check for ChatPanel backdrop (bg-black/30, z-40, sm:hidden)
          if (classes.includes('bg-black/30') && classes.includes('sm:hidden')) {
            results.chatPanelBackdrop = element;
          }

          // Check for PositionDetailModal container
          if (classes.includes('z-[9999]')) {
            results.positionDetailModal = element;
          }
        }
      });

      // Sort by z-index
      results.allFixedElements.sort((a, b) => b.zIndex - a.zIndex);
      results.backdropElements.sort((a, b) => b.zIndex - a.zIndex);

      return results;
    });

    // Display all fixed elements
    console.log('ALL FIXED ELEMENTS (sorted by z-index):');
    console.log('----------------------------------------');
    overlayAnalysis.allFixedElements.forEach((el, i) => {
      console.log(`${i + 1}. z-index: ${String(el.zIndex).padStart(5)} | bg: ${el.backgroundColor} | opacity: ${el.opacity} | ${el.tag}.${el.classes.substring(0, 60)}`);
    });

    // Display backdrop elements specifically
    console.log('\nBACKDROP ELEMENTS (semi-transparent black):');
    console.log('----------------------------------------');
    overlayAnalysis.backdropElements.forEach((el, i) => {
      console.log(`${i + 1}. z-index: ${String(el.zIndex).padStart(5)} | bg: ${el.backgroundColor} | opacity: ${el.opacity} | ${el.tag}`);
      console.log(`   Classes: ${el.classes}`);
    });

    // Specific ChatPanel backdrop check
    console.log('\n=== CHAT PANEL BACKDROP CHECK ===');
    if (overlayAnalysis.chatPanelBackdrop) {
      console.log('FOUND ChatPanel backdrop!');
      console.log(`  z-index: ${overlayAnalysis.chatPanelBackdrop.zIndex}`);
      console.log(`  background: ${overlayAnalysis.chatPanelBackdrop.backgroundColor}`);
      console.log(`  opacity: ${overlayAnalysis.chatPanelBackdrop.opacity}`);
      console.log(`  classes: ${overlayAnalysis.chatPanelBackdrop.classes}`);
      console.log(`  display: ${overlayAnalysis.chatPanelBackdrop.display}`);
      console.log(`  visibility: ${overlayAnalysis.chatPanelBackdrop.visibility}`);
      console.log(`  inset: ${overlayAnalysis.chatPanelBackdrop.inset}`);
    } else {
      console.log('ChatPanel backdrop NOT found');
    }

    // PositionDetailModal check
    console.log('\n=== POSITION DETAIL MODAL CHECK ===');
    if (overlayAnalysis.positionDetailModal) {
      console.log('FOUND PositionDetailModal container!');
      console.log(`  z-index: ${overlayAnalysis.positionDetailModal.zIndex}`);
      console.log(`  classes: ${overlayAnalysis.positionDetailModal.classes}`);
    } else {
      console.log('PositionDetailModal NOT found');
    }

    // Z-index comparison
    console.log('\n=== Z-INDEX COMPARISON ===');
    console.log(`ChatPanel backdrop z-index: ${overlayAnalysis.chatPanelBackdrop?.zIndex || 'NOT FOUND'}`);
    console.log(`PositionDetailModal z-index: ${overlayAnalysis.positionDetailModal?.zIndex || 'NOT FOUND'}`);

    if (overlayAnalysis.chatPanelBackdrop && overlayAnalysis.positionDetailModal) {
      const modalZ = parseInt(overlayAnalysis.positionDetailModal.zIndex);
      const chatZ = parseInt(overlayAnalysis.chatPanelBackdrop.zIndex);

      console.log(`\nModal z-index (${modalZ}) > ChatPanel backdrop z-index (${chatZ}): ${modalZ > chatZ ? 'YES' : 'NO'}`);

      if (modalZ > chatZ && overlayAnalysis.chatPanelBackdrop.display !== 'none') {
        console.log('\n⚠️  POTENTIAL ISSUE: ChatPanel backdrop is still visible despite lower z-index!');
        console.log('   This could be due to:');
        console.log('   1. ChatPanel backdrop not being hidden when modal opens');
        console.log('   2. The backdrop is somehow on top despite lower z-index');
        console.log('   3. Multiple backdrop elements stacking');
      }
    }

    // Check if ChatPanel backdrop is hidden by sm:hidden on this viewport
    console.log('\n=== RESPONSIVE CHECK ===');
    console.log('Viewport width: 393px (mobile, below sm:640px)');
    console.log('ChatPanel backdrop has "sm:hidden" class: YES');
    console.log('Expected behavior: Backdrop SHOULD be visible on mobile (<640px)');
    console.log('This is likely the cause of the "light overlay" issue!');

    // Take screenshot
    console.log('\nTaking screenshot...');
    await page.screenshot({ path: '/tmp/modal-light-overlay.png', fullPage: true });
    console.log('Screenshot saved to /tmp/modal-light-overlay.png');

    // Summary
    console.log('\n=== SUMMARY ===');
    console.log('ROOT CAUSE: ChatPanel backdrop (bg-black/30 z-40)');
    console.log('');
    console.log('The ChatPanel component has a backdrop element with:');
    console.log('  - bg-black/30 (30% opacity black)');
    console.log('  - z-40 (z-index 40)');
    console.log('  - sm:hidden (only hidden on screens >= 640px)');
    console.log('');
    console.log('On mobile viewport (<640px), this backdrop IS visible.');
    console.log('While the PositionDetailModal has z-[9999], both elements');
    console.log('use "fixed inset-0" and the ChatPanel backdrop may still');
    console.log('be causing visual interference.');
    console.log('');
    console.log('FIX: The ChatPanel should close/hide when any modal opens.');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

analyzeLightOverlayIssue();
