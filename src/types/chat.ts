export type ModelType = 'gpt-4o-mini' | 'gpt-4o' | 'claude-3-sonnet';

export interface ModelOption {
  id: ModelType;
  name: string;
  description: string;
}

export interface SVGPreviewProps {
  svgCode: string;
  onDownload?: () => void;
  size?: 'sm' | 'lg';
  showDownload?: boolean;
  onElementModify?: (prompt: string) => void;
  isInspecting?: boolean;
}

export interface SVGElement {
  id: string;
  type: string;
  attributes: Record<string, string>;
}

export interface InspectIconProps {
  isActive: boolean;
  onClick: () => void;
}

export interface ContextMessage {
  type: string;
  svg?: string;
  element?: string;
  optionNumber?: number;
}

export interface QuickActionProps {
  onAction: (action: string) => void;
  onDownload: () => void;
  svgCode: string;
}

export interface SVGInspectorProps {
  svgCode: string;
  onElementSelect: (element: SVGElement) => void;
}

export interface OptionSelectorProps {
  options: { svg: string; description: string }[];
  onSelect: (index: number) => void;
  onDownload: (svg: string) => void;
}

export interface VisualInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  contextMessage?: ContextMessage | null;
  onClearContext: () => void;
} 