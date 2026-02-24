import React from 'react';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children }) => {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#101010]">
      {/* 1. Imagem de Fundo (Dinheiro Caindo) */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-60 hidden md:block"
        style={{
          backgroundImage: 'url("https://blobgpedbfdjweiyxbzu.supabase.co/storage/v1/object/public/imagens/fundo.png")',
        }}
      />
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat md:hidden"
        style={{
          backgroundImage: 'url("https://blobgpedbfdjweiyxbzu.supabase.co/storage/v1/object/public/imagens/dolar%20(1).png")',
        }}
      />

      {/* 2. Camada de Gradiente para profundidade */}
      <div className="absolute inset-0 z-1 w-full h-full bg-gradient-to-t from-black via-transparent to-black/40" />


      {/* 4. Card Central (Login/Cadastro) */}
      <div className="relative z-20 w-full max-w-lg p-1">
        <div className="bg-[#1a1a1a]/50 backdrop-blur-2xl p-8 md:p-12 rounded-[2.5rem] border border-white/5 shadow-[0_0_100px_rgba(0,0,0,0.5)]">


          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
              {title}
            </h2>
            <p className="mt-3 text-white/60 text-lg leading-relaxed font-medium">
              {subtitle}
            </p>
          </div>

          <div className="bg-transparent border-none">
            {children}
          </div>


        </div>
      </div>

      {/* Efeito de vinheta lateral para dar foco ao centro - Escondido no mobile */}
      <div className="absolute inset-y-0 left-0 w-64 bg-gradient-to-r from-black/80 to-transparent z-5 pointer-events-none hidden md:block" />
      <div className="absolute inset-y-0 right-0 w-64 bg-gradient-to-l from-black/80 to-transparent z-5 pointer-events-none hidden md:block" />
    </div>
  );
};