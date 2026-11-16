import React from 'react';

export interface FormSubTabProgressBarProps {
  tabs: Array<{ key: string; label: string }>;
  activeKey: string;
  onSelectTab?: (key: string) => void;
  className?: string;
}

export const FormSubTabProgressBar: React.FC<FormSubTabProgressBarProps> = () => {
  return null;
};
