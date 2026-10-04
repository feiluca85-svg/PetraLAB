import Chat from "@/components/Chat";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full flex flex-col items-center">
        
        {/* Header App */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-2 tracking-tight">
            PetraLAB
          </h1>
          <p className="text-gray-600 max-w-md mx-auto text-sm sm:text-base font-medium">
            Il tuo tutor socratico personale.
          </p>
        </div>

        {/* Componente Chat Principale */}
        <Chat />
        
        <p className="mt-6 text-xs text-gray-400 text-center max-w-sm">
          PetraLAB usa l'intelligenza artificiale. Ricorda sempre di verificare le informazioni e concentrarti sul ragionamento!
        </p>
      </div>
    </main>
  );
}
