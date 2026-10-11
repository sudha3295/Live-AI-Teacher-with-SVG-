/**
 * SVG Extraction, XML Validation, and Sanitization
 * Reuses the implementation logic from SVG Teaching Visual Tester
 */

export interface SvgExtractResult {
  svgMarkup: string | null;
  error: string | null;
}

export function extractAndValidateSvg(raw: string): SvgExtractResult {
  if (!raw || !raw.trim()) {
    return { svgMarkup: null, error: 'Empty response received from SVG generator.' };
  }

  // Find start and end of SVG markup
  const startIdx = raw.indexOf('<svg');
  const endIdx = raw.lastIndexOf('</svg>');

  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    return {
      svgMarkup: null,
      error: 'No valid <svg>...</svg> markup found in the model response.',
    };
  }

  const svgContent = raw.substring(startIdx, endIdx + 6).trim();

  // Parse as XML to verify validity
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const parserError = doc.querySelector('parsererror');

    if (parserError) {
      return {
        svgMarkup: null,
        error: `SVG XML Parse Error: ${parserError.textContent?.trim() || 'Invalid XML'}`,
      };
    }

    const svgElement = doc.querySelector('svg');
    if (!svgElement) {
      return {
        svgMarkup: null,
        error: 'Parsed markup does not contain a root <svg> element.',
      };
    }

    // Strip script tags and dangerous attributes
    const scripts = svgElement.querySelectorAll('script');
    scripts.forEach((s) => s.remove());

    const allElements = svgElement.querySelectorAll('*');
    allElements.forEach((el) => {
      for (let i = el.attributes.length - 1; i >= 0; i--) {
        const attr = el.attributes[i];
        if (
          attr.name.toLowerCase().startsWith('on') ||
          attr.value.trim().toLowerCase().startsWith('javascript:')
        ) {
          el.removeAttribute(attr.name);
        }
      }
    });

    // Ensure responsive attributes and XML namespace
    if (!svgElement.getAttribute('xmlns')) {
      svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }

    return {
      svgMarkup: svgElement.outerHTML,
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      svgMarkup: null,
      error: `DOMParser Exception: ${message}`,
    };
  }
}
