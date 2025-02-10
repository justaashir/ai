import type { SVGElement } from '../types/chat';
export const extractSVGCode = (content: string) => {
  // Look for SVG code between backticks
  const svgMatch = content.match(/```svg\s*(.*?)\s*```|'''svg\s*(.*?)\s*'''|<svg[\s\S]*?<\/svg>/);
  if (svgMatch) {
    // Return the first non-undefined group (either from backticks or direct SVG)
    return (svgMatch[1] || svgMatch[2] || svgMatch[0]).trim();
  }
  return null;
};

export const extractElements = (node: Element): SVGElement[] => {
  const elements: SVGElement[] = [];
  if (node.tagName !== 'svg') {
    const attrs: Record<string, string> = {};
    node.getAttributeNames().forEach(name => {
      attrs[name] = node.getAttribute(name) || '';
    });
    elements.push({
      id: node.id || `${node.tagName}-${Math.random().toString(36).substr(2, 9)}`,
      type: node.tagName,
      attributes: attrs
    });
  }
  node.children && Array.from(node.children).forEach(child => {
    elements.push(...extractElements(child));
  });
  return elements;
};

export const extractOptions = (content: string) => {
  const options: { svg: string; description: string }[] = [];
  
  // Split content by "Option" markers
  const optionSections = content.split(/Option \d+:/);
  
  // Skip the first split as it's before "Option 1:"
  for (let i = 1; i < optionSections.length; i++) {
    const section = optionSections[i];
    
    // Extract description (everything up to the first SVG tag or triple quote)
    const descMatch = section.match(/(.*?)(?='''svg|<svg)/s);
    const description = descMatch ? descMatch[1].trim() : '';
    
    // Extract SVG code
    const svgCode = extractSVGCode(section);
    
    if (svgCode) {
      options.push({
        description,
        svg: svgCode
      });
    }
  }
  
  return options;
};

export const downloadSVG = (svgCode: string) => {
  const blob = new Blob([svgCode], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'logo.svg';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}; 