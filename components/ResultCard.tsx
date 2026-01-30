import React from 'react';

interface ResultCardProps {
  title: string;
  value: string;
  subValue?: string;
  description: string;
  // Classes de cor agora se aplicam apenas ao valor principal
  textColorClass?: string; 
}

export const ResultCard: React.FC<ResultCardProps> = ({
  title,
  value,
  subValue,
  description,
  textColorClass = 'text-primary', // Default para a cor primária
}) => {
  return (
    <div className="p-6 rounded-xl bg-card shadow-md border border-border flex flex-col justify-between h-full">
      <div>
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {/* Valor principal com a cor de destaque */}
        <p className={`text-4xl font-extrabold mt-1 ${textColorClass}`}>{value}</p>
        {/* Subvalor em muted-foreground */}
        {subValue && <p className="text-sm text-muted-foreground mt-1">{subValue}</p>}
      </div>
      {/* Descrição em muted-foreground */}
      <p className="text-xs text-muted-foreground mt-4">{description}</p>
    </div>
  );
};