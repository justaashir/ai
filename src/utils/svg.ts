import type { SVGElement } from '../types/chat';

export const getAdaptiveActions = (svgCode: string) => {
  const actions: { icon: string; action: string; title: string; }[] = [];
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgCode, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    
    if (svg) {
      // Always include iterate as first action
      actions.push({ icon: '🔄', action: 'Iterate', title: 'Iterate Design' });

      // Check for paths (complex shapes)
      const paths = svg.querySelectorAll('path');
      if (paths.length > 0) {
        actions.push({ icon: '✨', action: 'Simplify design', title: 'Simplify Design' });
        actions.push({ icon: '✏️', action: 'Add more detail', title: 'Add More Detail' });
      }

      // Check for fills/colors
      const elements = svg.querySelectorAll('*');
      const hasColors = Array.from(elements).some(el => 
        el.getAttribute('fill') || el.getAttribute('stroke')
      );
      if (hasColors) {
        actions.push({ icon: '🎨', action: 'Change colors', title: 'Change Colors' });
      }

      // Check for transformable elements
      const transformable = svg.querySelectorAll('circle, rect, path, polygon');
      if (transformable.length > 0) {
        actions.push({ icon: '↔️', action: 'Make it bigger', title: 'Make it Bigger' });
        actions.push({ icon: '↕️', action: 'Make it smaller', title: 'Make it Smaller' });
        actions.push({ icon: '🔄', action: 'Rotate elements', title: 'Rotate Elements' });
      }

      // Check for multiple elements (spacing)
      if (transformable.length > 1) {
        actions.push({ icon: '↔️', action: 'Adjust spacing', title: 'Adjust Spacing' });
      }

      // Check for text elements
      const text = svg.querySelectorAll('text');
      if (text.length > 0) {
        actions.push({ icon: '✏️', action: 'Edit text', title: 'Edit Text' });
        actions.push({ icon: '🔤', action: 'Change font', title: 'Change Font' });
      }

      // Style changes always available
      actions.push({ icon: '🎯', action: 'Change style', title: 'Change Style' });
    }
  } catch (err) {
    console.error('Error analyzing SVG:', err);
  }

  // If no actions were added (error case), return default set
  if (actions.length === 0) {
    return [
      { icon: '🔄', action: 'Iterate', title: 'Iterate Design' },
      { icon: '↔️', action: 'Make it bigger', title: 'Make it Bigger' },
      { icon: '🎨', action: 'Change colors', title: 'Change Colors' },
      { icon: '✨', action: 'Simplify design', title: 'Simplify Design' }
    ];
  }

  return actions;
};

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