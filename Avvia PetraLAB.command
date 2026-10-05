#!/bin/bash
cd "$(dirname "$0")"
echo "======================================"
echo " Avvio di PetraLAB in corso..."
echo "======================================"
echo ""
echo "Premi CTRL+C in questa finestra per spegnere il server."
echo ""
# Avvia il server di sviluppo
npm run dev &
PID=$!
# Aspetta qualche secondo che il server si alzi
sleep 3
# Apri il browser predefinito
open "http://localhost:3000"
# Tieni aperto il terminale
wait $PID
